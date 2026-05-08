import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { aiCredentialsTable, projectsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { geminiProvider } from "../lib/ai/geminiProvider.js";
import z from "zod";

const router: IRouter = Router();

const ProjectParams = z.object({ projectId: z.coerce.number() });
const CredentialIdParams = z.object({ projectId: z.coerce.number(), id: z.coerce.number() });

const CreateCredentialBody = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "mistral", "replit"]),
  model: z.string().nullish(),
  secret: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

const TestCredentialBody = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "mistral", "replit"]),
  secret: z.string().nullish(),
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

  const encryptedSecret = body.data.secret ? encrypt(body.data.secret) : null;

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
  const body = TestCredentialBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  if (body.data.provider === "replit" || body.data.provider === "gemini") {
    try {
      const ok = await geminiProvider.testConnection();
      res.json({ ok, message: ok ? "Conexión exitosa con Gemini (Replit AI)" : "Error al conectar con Gemini" });
    } catch (e) {
      res.json({ ok: false, message: String(e) });
    }
    return;
  }

  res.json({ ok: false, message: "Proveedor no soportado en esta versión" });
});

export default router;
