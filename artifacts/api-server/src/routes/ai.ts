import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { projectsTable, memoryItemsTable, continuityAlertsTable, sceneVersionsTable, scenesTable, aiCredentialsTable, chaptersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth.js";
import { geminiProvider, createCustomGeminiProvider } from "../lib/ai/geminiProvider.js";
import { createOpenAIProvider } from "../lib/ai/openaiProvider.js";
import { createAnthropicProvider } from "../lib/ai/anthropicProvider.js";
import { assembleContext, buildSystemPrompt, verifySceneOwnership, verifyChapterOwnership, verifySceneInProject, fetchRelevantMemory } from "../lib/ai/contextAssembler.js";
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
  buildImportStructurePrompt,
  buildImportCharactersPrompt,
  buildImportWorldRulesPrompt,
  buildImportLocationsPrompt,
  type ChatHistoryEntry,
} from "../lib/ai/prompts.js";
import { buildQueryEmbedding } from "../lib/ai/embeddingService.js";
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
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() })).optional(),
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
  function buildFromCred(cred: typeof aiCredentialsTable.$inferSelect) {
    if (!cred.encryptedSecret) return null;
    const apiKey = decrypt(cred.encryptedSecret);
    const model = cred.model ?? undefined;
    if (cred.provider === "openai") return createOpenAIProvider(apiKey, model);
    if (cred.provider === "anthropic") return createAnthropicProvider(apiKey, model);
    return createCustomGeminiProvider(apiKey, model);
  }

  try {
    // 1. Project-specific default
    const [projectCred] = await db
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

    if (projectCred) {
      const provider = buildFromCred(projectCred);
      if (provider) return provider;
    }

    // 2. Global default (projectId IS NULL)
    const [globalCred] = await db
      .select()
      .from(aiCredentialsTable)
      .where(
        and(
          isNull(aiCredentialsTable.projectId),
          eq(aiCredentialsTable.userId, userId),
          eq(aiCredentialsTable.isDefault, true)
        )
      )
      .limit(1);

    if (globalCred) {
      const provider = buildFromCred(globalCred);
      if (provider) return provider;
    }
  } catch {
    // fall through to built-in
  }

  // 3. Built-in Gemini (free, no key needed)
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

  // Use semantic search to find the most relevant memory items for the instruction
  const queryEmbedding = await buildQueryEmbedding(body.data.instruction);
  const memItems = await fetchRelevantMemory(body.data.projectId, queryEmbedding);

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

  const history: ChatHistoryEntry[] = (body.data.history ?? []).map((h) => ({
    role: h.role,
    text: h.text,
  }));

  const provider = await getProviderForProject(body.data.projectId, userId);
  const systemPrompt = buildFreeChatSystemPrompt();
  const prompt = buildFreeChatPrompt(ctx, body.data.message, history);
  const text = await provider.generateText(prompt, systemPrompt);
  res.json({ text });
});

const ImportStructureBody = z.object({
  projectId: z.coerce.number(),
  text: z.string().min(1),
  filename: z.string().default("documento"),
});

router.post("/ai/import-structure", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ImportStructureBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const prompt = buildImportStructurePrompt(body.data.text, body.data.filename);

  const raw = await provider.generateText(prompt, "Eres un asistente de edición literaria. Devuelve únicamente JSON válido, sin markdown ni texto adicional.");

  // Extract JSON — try direct parse first, then regex fallback
  let aiResult: { chapterTitle: string; sceneTitles?: string[] };
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/m, "").trim();
    aiResult = JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      res.status(422).json({ error: "AI did not return valid JSON", raw: raw.slice(0, 500) });
      return;
    }
    try {
      aiResult = JSON.parse(match[0]);
    } catch {
      res.status(422).json({ error: "AI did not return valid JSON", raw: raw.slice(0, 500) });
      return;
    }
  }

  // Split the FULL original text into N scenes based on the titles we got
  const sceneTitles: string[] = aiResult.sceneTitles?.length ? aiResult.sceneTitles : ["Escena 1"];
  const fullText = body.data.text;
  const paragraphs = fullText.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  const scenes: { title: string; content: string }[] = [];
  const n = sceneTitles.length;
  const chunkSize = Math.ceil(paragraphs.length / n);

  for (let i = 0; i < n; i++) {
    const start = i * chunkSize;
    const chunk = paragraphs.slice(start, start + chunkSize).join("\n\n");
    if (chunk.trim()) {
      scenes.push({ title: sceneTitles[i], content: chunk });
    }
  }

  // Safety: if splitting produced nothing, put everything in one scene
  if (scenes.length === 0) {
    scenes.push({ title: sceneTitles[0] ?? "Escena 1", content: fullText });
  }

  res.json({ chapterTitle: aiResult.chapterTitle, scenes });
});

const ImportCharactersBody = z.object({
  projectId: z.coerce.number(),
  text: z.string().min(1),
});

router.post("/ai/import-characters", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ImportCharactersBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const prompt = buildImportCharactersPrompt(body.data.text);

  const raw = await provider.generateText(prompt, "Eres un asistente de edición literaria. Devuelve únicamente JSON válido, sin markdown ni texto adicional.");

  type CharactersResult = { characters: { name: string; role: string; physicalDescription: string | null; personality: string | null; motivations: string | null; currentState: string | null; injuries: string | null; secrets: string | null }[] };
  const aiResult = extractJson<CharactersResult>(raw);
  if (!aiResult) { console.error("[import-characters] raw AI response:", raw.slice(0, 800)); res.status(422).json({ error: "AI did not return valid JSON", raw: raw.slice(0, 500) }); return; }

  const validRoles = ["protagonist", "antagonist", "secondary", "minor"];
  const characters = (aiResult.characters ?? []).map(c => ({
    name: c.name ?? "Personaje",
    role: validRoles.includes(c.role) ? c.role : "secondary",
    physicalDescription: c.physicalDescription ?? null,
    personality: c.personality ?? null,
    motivations: c.motivations ?? null,
    currentState: c.currentState ?? null,
    injuries: c.injuries ?? null,
    secrets: c.secrets ?? null,
  }));

  res.json({ characters });
});

function repairTruncatedJson(s: string): string {
  let inString = false, escaped = false;
  const stack: string[] = [];
  let i = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\" && inString) { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
  }
  let result = s.trimEnd();
  if (inString) {
    const lastQuote = result.lastIndexOf('"');
    result = result.slice(0, lastQuote).replace(/[,:]?\s*$/, "");
  }
  // Remove trailing incomplete key-value pair (e.g. ,"key": )
  result = result.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  result = result.replace(/,\s*$/, "");
  for (let j = stack.length - 1; j >= 0; j--) {
    result += stack[j] === "{" ? "}" : "]";
  }
  return result;
}

function extractJson<T>(raw: string): T | null {
  const strip = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/```\s*$/m, "")
    .trim();
  // 1. Try as-is
  try { return JSON.parse(strip) as T; } catch { /* try harder */ }
  // 2. Extract from first { to last }
  const first = strip.indexOf("{");
  const last  = strip.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(strip.slice(first, last + 1)) as T; } catch { /* fall through */ }
  }
  // 3. Try to repair truncated JSON
  if (first !== -1) {
    try { return JSON.parse(repairTruncatedJson(strip.slice(first))) as T; } catch { /* fall through */ }
  }
  return null;
}

const ImportLocationsBody = z.object({
  projectId: z.coerce.number(),
  text: z.string().min(1),
});

router.post("/ai/import-locations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ImportLocationsBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const prompt = buildImportLocationsPrompt(body.data.text);

  const raw = await provider.generateText(prompt, "Eres un asistente de edición literaria. Devuelve únicamente JSON válido, sin markdown ni texto adicional.");

  type LocationsResult = { locations: { name: string; description: string | null; significance: string | null }[] };
  const aiResult = extractJson<LocationsResult>(raw);
  if (!aiResult) { console.error("[import-locations] raw AI response:", raw.slice(0, 800)); res.status(422).json({ error: "AI did not return valid JSON", raw: raw.slice(0, 500) }); return; }

  const locations = (aiResult.locations ?? []).map(l => ({
    name: l.name ?? "Lugar",
    description: l.description ?? null,
    significance: l.significance ?? null,
  }));

  res.json({ locations });
});

const ImportWorldRulesBody = z.object({
  projectId: z.coerce.number(),
  text: z.string().min(1),
});

router.post("/ai/import-world-rules", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ImportWorldRulesBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const project = await verifyProject(body.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const provider = await getProviderForProject(body.data.projectId, userId);
  const prompt = buildImportWorldRulesPrompt(body.data.text);

  const raw = await provider.generateText(prompt, "Eres un asistente de edición literaria. Devuelve únicamente JSON válido, sin markdown ni texto adicional.");

  type WorldRulesResult = { worldRules: { title: string; category: string | null; content: string }[] };
  const aiResult = extractJson<WorldRulesResult>(raw);
  if (!aiResult) { console.error("[import-world-rules] raw AI response:", raw.slice(0, 800)); res.status(422).json({ error: "AI did not return valid JSON", raw: raw.slice(0, 500) }); return; }

  const worldRules = (aiResult.worldRules ?? []).map(r => ({
    title: r.title ?? "Regla",
    category: r.category ?? null,
    content: r.content ?? "",
  }));

  res.json({ worldRules });
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
