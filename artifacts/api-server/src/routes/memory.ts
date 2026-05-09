import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { memoryItemsTable, projectsTable } from "@workspace/db";
import {
  ListMemoryItemsParams,
  CreateMemoryItemParams,
  CreateMemoryItemBody,
  UpdateMemoryItemParams,
  UpdateMemoryItemBody,
  DeleteMemoryItemParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import { embedMemoryItem } from "../lib/ai/embeddingService.js";

const router: IRouter = Router();

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return project ?? null;
}

router.get("/projects/:projectId/memory", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListMemoryItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const items = await db
    .select()
    .from(memoryItemsTable)
    .where(eq(memoryItemsTable.projectId, params.data.projectId));
  res.json(items);
});

router.post("/projects/:projectId/memory", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateMemoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateMemoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .insert(memoryItemsTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(item);
  embedMemoryItem(item.id, item.title, item.content).catch(() => {});
});

router.patch("/projects/:projectId/memory/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateMemoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UpdateMemoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(memoryItemsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(memoryItemsTable.id, params.data.id), eq(memoryItemsTable.projectId, params.data.projectId)))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Memory item not found" });
    return;
  }
  res.json(item);
  if (item.title && item.content) {
    embedMemoryItem(item.id, item.title, item.content).catch(() => {});
  }
});

router.delete("/projects/:projectId/memory/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteMemoryItemParams.safeParse(req.params);
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
    .delete(memoryItemsTable)
    .where(and(eq(memoryItemsTable.id, params.data.id), eq(memoryItemsTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Memory item not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
