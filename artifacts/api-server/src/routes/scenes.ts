import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { scenesTable, chaptersTable, booksTable, projectsTable } from "@workspace/db";
import {
  ListScenesParams,
  CreateSceneParams,
  CreateSceneBody,
  GetSceneParams,
  UpdateSceneParams,
  UpdateSceneBody,
  DeleteSceneParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

async function verifyChapterOwnership(chapterId: number, userId: string) {
  const [chapter] = await db
    .select({ id: chaptersTable.id })
    .from(chaptersTable)
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .innerJoin(projectsTable, eq(booksTable.projectId, projectsTable.id))
    .where(and(eq(chaptersTable.id, chapterId), eq(projectsTable.userId, userId)));
  return chapter ?? null;
}

router.get("/chapters/:chapterId/scenes", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListScenesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chapter = await verifyChapterOwnership(params.data.chapterId, userId);
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.chapterId, params.data.chapterId))
    .orderBy(asc(scenesTable.position));
  res.json(scenes);
});

router.post("/chapters/:chapterId/scenes", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chapter = await verifyChapterOwnership(params.data.chapterId, userId);
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const parsed = CreateSceneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const wordCount = parsed.data.content ? parsed.data.content.split(/\s+/).filter(Boolean).length : 0;
  const [scene] = await db
    .insert(scenesTable)
    .values({ ...parsed.data, chapterId: params.data.chapterId, wordCount })
    .returning();
  res.status(201).json(scene);
});

router.get("/chapters/:chapterId/scenes/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chapter = await verifyChapterOwnership(params.data.chapterId, userId);
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const [scene] = await db
    .select()
    .from(scenesTable)
    .where(and(eq(scenesTable.id, params.data.id), eq(scenesTable.chapterId, params.data.chapterId)));
  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }
  res.json(scene);
});

router.patch("/chapters/:chapterId/scenes/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chapter = await verifyChapterOwnership(params.data.chapterId, userId);
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const parsed = UpdateSceneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.content !== undefined && parsed.data.wordCount === undefined) {
    updateData.wordCount = parsed.data.content
      ? parsed.data.content.split(/\s+/).filter(Boolean).length
      : 0;
  }

  const [scene] = await db
    .update(scenesTable)
    .set(updateData)
    .where(and(eq(scenesTable.id, params.data.id), eq(scenesTable.chapterId, params.data.chapterId)))
    .returning();
  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }
  res.json(scene);
});

router.delete("/chapters/:chapterId/scenes/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chapter = await verifyChapterOwnership(params.data.chapterId, userId);
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const [deleted] = await db
    .delete(scenesTable)
    .where(and(eq(scenesTable.id, params.data.id), eq(scenesTable.chapterId, params.data.chapterId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
