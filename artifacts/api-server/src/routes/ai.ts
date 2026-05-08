import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { projectsTable, memoryItemsTable, continuityAlertsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth.js";
import { geminiProvider } from "../lib/ai/geminiProvider.js";
import { assembleContext, buildSystemPrompt } from "../lib/ai/contextAssembler.js";
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

function safeParseJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

router.post("/ai/continue-scene", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ContinueSceneBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId);
  const systemPrompt = buildSystemPrompt(ctx);
  const prompt = buildContinueScenePrompt(ctx, body.data.instruction ?? undefined);

  const text = await geminiProvider.generateText(prompt, systemPrompt);
  res.json({ text });
});

router.post("/ai/rewrite-selection", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = RewriteSelectionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId);
  const systemPrompt = buildSystemPrompt(ctx);
  const prompt = buildRewriteSelectionPrompt(body.data.selectedText, body.data.instruction);

  const text = await geminiProvider.generateText(prompt, systemPrompt);
  res.json({ text });
});

router.post("/ai/review-coherence", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ReviewCoherenceBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId);
  const systemPrompt = buildSystemPrompt(ctx);
  const prompt = buildReviewCoherencePrompt(ctx);

  const raw = await geminiProvider.generateText(prompt, systemPrompt);
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

  const memItems = await db
    .select({ type: memoryItemsTable.type, title: memoryItemsTable.title, content: memoryItemsTable.content, status: memoryItemsTable.status })
    .from(memoryItemsTable)
    .where(and(eq(memoryItemsTable.projectId, body.data.projectId), eq(memoryItemsTable.status, "canonical")));

  const prompt = buildExtractMemoryPrompt(body.data.text);
  const systemPrompt = `Eres un asistente literario que extrae elementos narrativos importantes de textos de ficción. Responde SOLO en JSON válido.`;
  const raw = await geminiProvider.generateText(prompt, systemPrompt);
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

  const prompt = buildCheckContradictionPrompt(body.data.instruction, memItems);
  const systemPrompt = `Eres un analizador de continuidad narrativa. Responde SOLO en JSON válido.`;
  const raw = await geminiProvider.generateText(prompt, systemPrompt);
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

  let ctx: NarrativeContext = {};
  if (body.data.sceneId && body.data.chapterId) {
    ctx = await assembleContext(body.data.sceneId, body.data.chapterId, body.data.projectId);
  }

  const systemPrompt = buildFreeChatSystemPrompt();
  const prompt = buildFreeChatPrompt(ctx, body.data.message);
  const text = await geminiProvider.generateText(prompt, systemPrompt);
  res.json({ text });
});

export default router;
