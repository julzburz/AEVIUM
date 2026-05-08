import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { worldRulesTable, projectsTable } from "@workspace/db";
import {
  ListWorldRulesParams,
  CreateWorldRuleParams,
  CreateWorldRuleBody,
  UpdateWorldRuleParams,
  UpdateWorldRuleBody,
  DeleteWorldRuleParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return project ?? null;
}

router.get("/projects/:projectId/world-rules", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListWorldRulesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const rules = await db
    .select()
    .from(worldRulesTable)
    .where(eq(worldRulesTable.projectId, params.data.projectId));
  res.json(rules);
});

router.post("/projects/:projectId/world-rules", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateWorldRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateWorldRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db
    .insert(worldRulesTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(rule);
});

router.patch("/projects/:projectId/world-rules/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateWorldRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UpdateWorldRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db
    .update(worldRulesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(worldRulesTable.id, params.data.id), eq(worldRulesTable.projectId, params.data.projectId)))
    .returning();
  if (!rule) {
    res.status(404).json({ error: "World rule not found" });
    return;
  }
  res.json(rule);
});

router.delete("/projects/:projectId/world-rules/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteWorldRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [deleted] = await db
    .delete(worldRulesTable)
    .where(and(eq(worldRulesTable.id, params.data.id), eq(worldRulesTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "World rule not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
