import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { projectsTable, memoryItemsTable, continuityAlertsTable, sceneVersionsTable, scenesTable, aiCredentialsTable, chaptersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth.js";
import { geminiProvider, createCustomGeminiProvider } from "../lib/ai/geminiProvider.js";
import { createOpenAIProvider } from "../lib/ai/openaiProvider.js";
import { createAnthropicProvider } from "../lib/ai/anthropicProvider.js";
import { assembleContext, buildSystemPrompt, verifySceneOwnership, verifyChapterOwnership, verifySceneInProject } from "../lib/ai/contextAssembler.js";
import { decrypt } from "../lib/encryption.js";
import type { NarrativeContext } from "../lib/ai/types.js";
import {
  buildContinueScenePrompt,
  buildRewriteSelectionPrompt,
  buildReviewCoherencePrompt,
  buildExtractMemoryPrompt,
  buildCheckContradictionPrompt,
  buildFreeChatPrompt,
  buildFreeChatSystemPrompt,
} from "../lib/ai/prompts.js";
import { charactersTable, locationsTable, styleGuidesTable } from "@workspace/db";
import z from "zod";

const router: IRouter = Router();

const ContinueSceneBody = z.object({
  sceneId: z.coerce.number(),
  chapterId: z.coerce.number(),
  projectId: z.coerce.number(),
  instruction: z.string().nullish(),
});

const RewriteSelectionBody = z.object({
  sceneId: z.coerce.number(),
  chapterId: z.coerce.number(),
  projectId: z.coerce.number(),
  selectedText: z.string().min(1),
  instruction: z.string().min(1),
});

const ReviewCoherenceBody = z.object({
  sceneId: z.coerce.number(),
  chapterId: z.coerce.number(),
  projectId: z.coerce.number(),
});

const ExtractMemoryBody = z.object({
  projectId: z.coerce.number(),
  text: z.string().min(1),
  sceneId: z.coerce.number().nullish(),
});

const CheckContradictionBody = z.object({
  projectId: z.coerce.number(),
  instruction: z.string().min(1),
});

const FreeChatBody = z.object({
  projectId: z.coerce.number(),
  sceneId: z.coerce.number().nullish(),
  chapterId: z.coerce.number().nullish(),
  message: z.string().min(1),
});

async function verifyProject(projectId: number, userId: string) {
  const [p] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

/**
 * Returns the AI provider to use for a project: checks for a user-specific
 * default credential first, decrypts it, and falls back to the built-in provider.
 */
async function getProviderForProject(projectId: number, userId: string) {
  try {
    const [cred] = await db
      .select()
      .from(aiCredentialsTable)
      .where(
        and(
          eq(aiCredentialsTable.projectId, projectId),
          eq(aiCredentialsTable.userId, userId),
          eq(aiCredentialsTable.isDefault, true)
        )
      )
      .limit(1);

    if (cred?.encryptedSecret) {
      const apiKey = decrypt(cred.encryptedSecret);
      const model = cred.model ?? undefined;
      if (cred.provider === "openai") return createOpenAIProvider(apiKey, model);
      if (cred.provider === "anthropic") return createAnthropicProvider(apiKey, model);
      return createCustomGeminiProvider(apiKey, model);
    }
  } catch {
    // fall through to built-in
  }
  return geminiProvider;
}

function safeParseJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const ContextSummaryBody = z.object({
  projectId: z.coerce.number(),
  sceneId: z.coerce.number(),
  chapterId: z.coerce.number(),
});

router.post("/ai/context-summary", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ContextSummaryBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ownershipOk = await verifySceneOwnership(body.data.sceneId, body.data.chapterId, body.data.projectId);
  if (!ownershipOk) { res.status(403).json({ error: "Scene does not belong to this project" }); return; }

  const [scene, chapter, characters, memoryItems, styleGuide] = await Promise.all([
    db.select({ title: scenesTable.title }).from(scenesTable).where(eq(scenesTable.id, body.data.sceneId)).limit(1),
    db.select({ title: chaptersTable.title }).from(chaptersTable).where(eq(chaptersTable.id, body.data.chapterId)).limit(1),
    db.select({ id: charactersTable.id }).from(charactersTable).where(eq(charactersTable.projectId, body.data.projectId)),
    db.select({ id: memoryItemsTable.id }).from(memoryItemsTable)
      .where(and(eq(memoryItemsTable.projectId, body.data.projectId), eq(memoryItemsTable.status, "canonical"))),
    db.select({ id: styleGuidesTable.id }).from(styleGuidesTable).where(eq(styleGuidesTable.projectId, body.data.projectId)).limit(1),
  ]);

  const allScenes = await db
    .select({ id: scenesTable.id, position: scenesTable.position })
    .from(scenesTable)
    .where(eq(scenesTable.chapterId, body.data.chapterId));
  const currentScene = allScenes.find((s) => s.id === body.data.sceneId);
  const hasPreviousScene = currentScene ? allScenes.some((s) => s.position < (currentScene.position ?? 0)) : false;

  res.json({
    characterCount: characters.length,
    memoryCount: memoryItems.length,
    hasPreviousScene,
    hasStyleGuide: styleGuide.length > 0,
    sceneTitle: scene[0]?.title,
    chapterTitle: chapter[0]?.title,
  });
});

router.post("/ai/continue-scene", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ContinueSceneBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ownershipOk = await verifySceneOwnership(body.data.sceneId, body.data.chapterId, body.data.projectId);
  if (!ownershipOk) { res.status(403).json({ error: "Scene does not belong to this project" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const queryText = [body.data.instruction, body.data.instruction].filter(Boolean).join(" ") || undefined;
  const ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId, queryText);
  const systemPrompt = buildSystemPrompt(ctx);
  const prompt = buildContinueScenePrompt(ctx, body.data.instruction ?? undefined);

  const text = await provider.generateText(prompt, systemPrompt);

  const originalContent = ctx.sceneContent ?? null;
  const [version] = await db
    .insert(sceneVersionsTable)
    .values({
      sceneId: body.data.sceneId,
      originalContent,
      userInstruction: body.data.instruction ?? null,
      proposedContent: text,
      status: "pending",
      userId,
    })
    .returning({ id: sceneVersionsTable.id });

  res.json({ text, sceneVersionId: version?.id ?? null });
});

router.post("/ai/rewrite-selection", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = RewriteSelectionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ownershipOk = await verifySceneOwnership(body.data.sceneId, body.data.chapterId, body.data.projectId);
  if (!ownershipOk) { res.status(403).json({ error: "Scene does not belong to this project" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const queryText = `${body.data.selectedText} ${body.data.instruction}`.trim();
  const ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId, queryText);
  const systemPrompt = buildSystemPrompt(ctx);
  const prompt = buildRewriteSelectionPrompt(body.data.selectedText, body.data.instruction);

  const text = await provider.generateText(prompt, systemPrompt);

  const [version] = await db
    .insert(sceneVersionsTable)
    .values({
      sceneId: body.data.sceneId,
      originalContent: body.data.selectedText,
      userInstruction: body.data.instruction,
      proposedContent: text,
      status: "pending",
      userId,
    })
    .returning({ id: sceneVersionsTable.id });

  res.json({ text, sceneVersionId: version?.id ?? null });
});

router.post("/ai/review-coherence", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ReviewCoherenceBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ownershipOk = await verifySceneOwnership(body.data.sceneId, body.data.chapterId, body.data.projectId);
  if (!ownershipOk) { res.status(403).json({ error: "Scene does not belong to this project" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId);
  const systemPrompt = buildSystemPrompt(ctx);
  const prompt = buildReviewCoherencePrompt(ctx);  

  const raw = await provider.generateText(prompt, systemPrompt);
  const parsed = safeParseJson(raw) as { issues?: unknown[]; summary?: string } | null;

  const CoherenceIssue = z.object({
    type: z.string(),
    description: z.string(),
    suggestion: z.string().nullish(),
  });
  const issues = parsed?.issues
    ? z.array(CoherenceIssue).safeParse(parsed.issues).data ?? []
    : [];

  res.json({
    issues,
    summary: parsed?.summary ?? raw.slice(0, 300),
  });

  if (issues.length > 0) {
    await db.insert(continuityAlertsTable).values(
      issues.map((issue: { type: string; description: string; suggestion?: string | null }) => ({
        projectId: body.data.projectId,
        sceneId: body.data.sceneId,
        message: issue.description,
        severity: "warning" as const,
        isResolved: false,
      }))
    );
  }
});

router.post("/ai/extract-memory", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ExtractMemoryBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  if (body.data.sceneId) {
    const ownershipOk = await verifySceneInProject(body.data.sceneId, body.data.projectId);
    if (!ownershipOk) { res.status(403).json({ error: "Scene not found or does not belong to this project" }); return; }
  }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const prompt = buildExtractMemoryPrompt(body.data.text);
  const systemPrompt = `Eres un asistente literario que extrae elementos narrativos importantes de textos de ficción. Responde SOLO en JSON válido.`;
  const raw = await provider.generateText(prompt, systemPrompt);
  const parsed = safeParseJson(raw) as { suggestions?: unknown[] } | null;

  const MemSuggestion = z.object({
    type: z.enum(["event", "injury", "secret", "relationship", "death", "promise", "mystery", "location_change", "knowledge", "other"]),
    title: z.string(),
    content: z.string(),
    confidence: z.number().int().min(0).max(100),
  });
  const suggestions = parsed?.suggestions
    ? z.array(MemSuggestion).safeParse(parsed.suggestions).data ?? []
    : [];

  res.json({ suggestions });
});

router.post("/ai/check-contradiction", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = CheckContradictionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const memItems = await db
    .select({ type: memoryItemsTable.type, title: memoryItemsTable.title, content: memoryItemsTable.content, status: memoryItemsTable.status })
    .from(memoryItemsTable)
    .where(and(eq(memoryItemsTable.projectId, body.data.projectId), eq(memoryItemsTable.status, "canonical")));

  if (memItems.length === 0) {
    res.json({ hasContradiction: false, contradictions: [] });
    return;
  }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const prompt = buildCheckContradictionPrompt(body.data.instruction, memItems);
  const systemPrompt = `Eres un analizador de continuidad narrativa. Responde SOLO en JSON válido.`;
  const raw = await provider.generateText(prompt, systemPrompt);
  const parsed = safeParseJson(raw) as { hasContradiction?: boolean; contradictions?: unknown[] } | null;

  const Contradiction = z.object({
    description: z.string(),
    conflictingMemory: z.string(),
    options: z.array(z.string()),
  });
  const contradictions = parsed?.contradictions
    ? z.array(Contradiction).safeParse(parsed.contradictions).data ?? []
    : [];

  res.json({
    hasContradiction: parsed?.hasContradiction ?? false,
    contradictions,
  });
});

router.post("/ai/free-chat", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = FreeChatBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  if (body.data.sceneId && body.data.chapterId) {
    const ownershipOk = await verifySceneOwnership(body.data.sceneId, body.data.chapterId, body.data.projectId);
    if (!ownershipOk) { res.status(403).json({ error: "Scene does not belong to this project" }); return; }
  } else if (body.data.chapterId) {
    const ownershipOk = await verifyChapterOwnership(body.data.chapterId, body.data.projectId);
    if (!ownershipOk) { res.status(403).json({ error: "Chapter does not belong to this project" }); return; }
  }

  let ctx: NarrativeContext = {};
  if (body.data.sceneId && body.data.chapterId) {
    ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId, body.data.message);
  }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const systemPrompt = buildFreeChatSystemPrompt();
  const prompt = buildFreeChatPrompt(ctx, body.data.message);
  const text = await provider.generateText(prompt, systemPrompt);
  res.json({ text });
});

router.post("/ai/test-builtin", requireAuth, async (_req, res): Promise<void> => {
  try {
    const ok = await geminiProvider.testConnection();
    res.json({ ok, message: ok ? "Conexión correcta con Gemini integrado" : "No se pudo conectar con Gemini" });
  } catch (e) {
    res.json({ ok: false, message: String(e) });
  }
});

export default router;
