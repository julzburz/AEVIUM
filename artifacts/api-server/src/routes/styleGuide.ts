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

export default router;
