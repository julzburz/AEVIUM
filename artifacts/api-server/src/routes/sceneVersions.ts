import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { sceneVersionsTable, scenesTable, chaptersTable, booksTable, projectsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";
import z from "zod";

const router: IRouter = Router();

async function verifySceneOwnership(chapterId: number, sceneId: number, userId: string) {
  const [scene] = await db
    .select({ id: scenesTable.id })
    .from(scenesTable)
    .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .innerJoin(projectsTable, eq(booksTable.projectId, projectsTable.id))
    .where(
      and(
        eq(scenesTable.id, sceneId),
        eq(scenesTable.chapterId, chapterId),
        eq(projectsTable.userId, userId)
      )
    );
  return scene ?? null;
}

const PatchVersionBody = z.object({
  status: z.enum(["accepted", "rejected"]),
});

router.get("/chapters/:chapterId/scenes/:sceneId/versions", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const chapterId = Number(req.params.chapterId);
  const sceneId = Number(req.params.sceneId);

  if (!chapterId || !sceneId) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const scene = await verifySceneOwnership(chapterId, sceneId, userId);
  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }

  const versions = await db
    .select()
    .from(sceneVersionsTable)
    .where(eq(sceneVersionsTable.sceneId, sceneId))
    .orderBy(desc(sceneVersionsTable.createdAt));

  res.json(versions);
});

router.patch("/chapters/:chapterId/scenes/:sceneId/versions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const chapterId = Number(req.params.chapterId);
  const sceneId = Number(req.params.sceneId);
  const versionId = Number(req.params.id);

  if (!chapterId || !sceneId || !versionId) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const body = PatchVersionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const scene = await verifySceneOwnership(chapterId, sceneId, userId);
  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }

  const [updated] = await db
    .update(sceneVersionsTable)
    .set({ status: body.data.status })
    .where(and(eq(sceneVersionsTable.id, versionId), eq(sceneVersionsTable.sceneId, sceneId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Version not found" });
    return;
  }

  res.json(updated);
});

export default router;
