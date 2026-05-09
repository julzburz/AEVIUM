import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { aiCredentialsTable, projectsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { geminiProvider, createCustomGeminiProvider } from "../lib/ai/geminiProvider.js";
import { createOpenAIProvider } from "../lib/ai/openaiProvider.js";
import { createAnthropicProvider } from "../lib/ai/anthropicProvider.js";
import z from "zod";

const router: IRouter = Router();

const SUPPORTED_PROVIDERS = ["openai", "anthropic", "gemini", "mistral"] as const;
type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

const ProjectParams = z.object({ projectId: z.coerce.number() });
const CredentialIdParams = z.object({ projectId: z.coerce.number(), id: z.coerce.number() });

const CreateCredentialBody = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "mistral", "replit"]),
  model: z.string().nullish(),
  secret: z.string().min(1, "API key is required"),
  isDefault: z.boolean().optional(),
});

const TestCredentialBody = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "mistral", "replit"]),
  secret: z.string().nullish(),
  credentialId: z.coerce.number().optional(),
});

async function verifyProject(projectId: number, userId: string) {
  const [p] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

function formatCredential(c: typeof aiCredentialsTable.$inferSelect) {
  return {
    id: c.id,
    projectId: c.projectId,
    provider: c.provider,
    model: c.model,
    isDefault: c.isDefault,
    hasSecret: !!c.encryptedSecret,
    createdAt: c.createdAt,
  };
}

function buildProvider(provider: SupportedProvider | "replit", apiKey: string, model?: string) {
  if (provider === "openai") return createOpenAIProvider(apiKey, model);
  if (provider === "anthropic") return createAnthropicProvider(apiKey, model);
  return createCustomGeminiProvider(apiKey, model);
}

router.get("/projects/:projectId/ai-credentials", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const creds = await db
    .select()
    .from(aiCredentialsTable)
    .where(and(eq(aiCredentialsTable.userId, userId), eq(aiCredentialsTable.projectId, params.data.projectId)));
  res.json(creds.map(formatCredential));
});

router.post("/projects/:projectId/ai-credentials", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const body = CreateCredentialBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const encryptedSecret = encrypt(body.data.secret);

  if (body.data.isDefault) {
    await db
      .update(aiCredentialsTable)
      .set({ isDefault: false })
      .where(and(eq(aiCredentialsTable.userId, userId), eq(aiCredentialsTable.projectId, params.data.projectId)));
  }

  const providerValue = body.data.provider === "replit" ? "gemini" : body.data.provider;
  const [cred] = await db
    .insert(aiCredentialsTable)
    .values({
      userId,
      projectId: params.data.projectId,
      provider: providerValue as "openai" | "anthropic" | "gemini" | "mistral",
      model: body.data.model ?? null,
      encryptedSecret,
      isDefault: body.data.isDefault ?? false,
    })
    .returning();
  res.status(201).json(formatCredential(cred));
});

router.patch("/projects/:projectId/ai-credentials/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CredentialIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [existing] = await db
    .select()
    .from(aiCredentialsTable)
    .where(and(eq(aiCredentialsTable.id, params.data.id), eq(aiCredentialsTable.userId, userId), eq(aiCredentialsTable.projectId, params.data.projectId)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Credential not found" }); return; }

  const body = z.object({ isDefault: z.boolean().optional(), model: z.string().nullish() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  if (body.data.isDefault === true) {
    await db
      .update(aiCredentialsTable)
      .set({ isDefault: false })
      .where(and(eq(aiCredentialsTable.userId, userId), eq(aiCredentialsTable.projectId, params.data.projectId)));
  }

  const [updated] = await db
    .update(aiCredentialsTable)
    .set({
      ...(body.data.isDefault !== undefined ? { isDefault: body.data.isDefault } : {}),
      ...(body.data.model !== undefined ? { model: body.data.model } : {}),
    })
    .where(eq(aiCredentialsTable.id, params.data.id))
    .returning();

  res.json(formatCredential(updated));
});

router.delete("/projects/:projectId/ai-credentials/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CredentialIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  await db
    .delete(aiCredentialsTable)
    .where(and(eq(aiCredentialsTable.id, params.data.id), eq(aiCredentialsTable.userId, userId)));
  res.sendStatus(204);
});

router.post("/projects/:projectId/ai-credentials/test", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const body = TestCredentialBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  // Test a saved credential by ID
  if (body.data.credentialId) {
    const [cred] = await db
      .select()
      .from(aiCredentialsTable)
      .where(
        and(
          eq(aiCredentialsTable.id, body.data.credentialId),
          eq(aiCredentialsTable.userId, userId),
          eq(aiCredentialsTable.projectId, params.data.projectId)
        )
      )
      .limit(1);

    if (!cred || !cred.encryptedSecret) {
      res.json({ ok: false, message: "Credencial no encontrada o sin clave guardada" });
      return;
    }

    try {
      const apiKey = decrypt(cred.encryptedSecret);
      const provider = buildProvider(cred.provider as SupportedProvider, apiKey, cred.model ?? undefined);
      const ok = await provider.testConnection();
      const name = cred.provider.charAt(0).toUpperCase() + cred.provider.slice(1);
      res.json({ ok, message: ok ? `Conexión exitosa con ${name}` : `Error al conectar con ${name}` });
    } catch (e) {
      res.json({ ok: false, message: `Error: ${String(e)}` });
    }
    return;
  }

  // Test a raw key (not saved yet)
  if (body.data.secret) {
    try {
      const provider = buildProvider(body.data.provider, body.data.secret);
      const ok = await provider.testConnection();
      const name = body.data.provider.charAt(0).toUpperCase() + body.data.provider.slice(1);
      res.json({ ok, message: ok ? `Conexión exitosa con ${name}` : `Error al conectar con ${name}` });
    } catch (e) {
      res.json({ ok: false, message: `Error: ${String(e)}` });
    }
    return;
  }

  // Test the built-in Gemini
  try {
    const ok = await geminiProvider.testConnection();
    res.json({ ok, message: ok ? "Conexión exitosa con Gemini (integrado)" : "Error al conectar con Gemini" });
  } catch (e) {
    res.json({ ok: false, message: String(e) });
  }
});

export default router;
