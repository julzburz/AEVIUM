import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { styleGuidesTable, projectsTable } from "@workspace/db";
import {
  GetStyleGuideParams,
  UpsertStyleGuideParams,
  UpsertStyleGuideBody,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import { geminiProvider } from "../lib/ai/geminiProvider.js";
import {
  buildStyleChatSystemPrompt,
  buildStyleChatPrompt,
  buildStyleAnalyzePrompt,
} from "../lib/ai/prompts.js";
import z from "zod";

const router: IRouter = Router();

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return project ?? null;
}

router.get("/projects/:projectId/style-guide", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetStyleGuideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [guide] = await db
    .select()
    .from(styleGuidesTable)
    .where(eq(styleGuidesTable.projectId, params.data.projectId));
  if (!guide) {
    res.status(404).json({ error: "Style guide not found" });
    return;
  }
  res.json(guide);
});

router.put("/projects/:projectId/style-guide", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpsertStyleGuideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UpsertStyleGuideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [guide] = await db
    .insert(styleGuidesTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .onConflictDoUpdate({
      target: styleGuidesTable.projectId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.json(guide);
});

const StyleChatBody = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});

function extractParams(text: string): Record<string, unknown> | null {
  const match = text.match(/###PARAMS###\s*([\s\S]*?)\s*###END_PARAMS###/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

router.post("/projects/:projectId/style-guide/chat", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }
  const project = await verifyProjectOwnership(projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = StyleChatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { messages } = parsed.data;
  const systemPrompt = buildStyleChatSystemPrompt();
  const prompt = buildStyleChatPrompt(messages);

  const raw = await geminiProvider.generateText(prompt, systemPrompt);

  const params = extractParams(raw);
  const done = params !== null;
  const reply = raw.replace(/###PARAMS###[\s\S]*?###END_PARAMS###/, "").trim();

  res.json({ reply, done, params: done ? params : undefined });
});

const StyleAnalyzeBody = z.object({
  text: z.string().min(50),
});

router.post("/projects/:projectId/style-guide/analyze", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }
  const project = await verifyProjectOwnership(projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = StyleAnalyzeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const prompt = buildStyleAnalyzePrompt(parsed.data.text);
  const raw = await geminiProvider.generateText(prompt, "Eres un analizador de estilo literario. Responde SOLO en JSON sin texto adicional.");

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) { res.status(500).json({ error: "Could not parse style analysis" }); return; }

  try {
    const result = JSON.parse(jsonMatch[0]);
    const { summary, ...params } = result;
    res.json({ summary: summary ?? "", params });
  } catch {
    res.status(500).json({ error: "Invalid JSON from AI" });
  }
});

export default router;
