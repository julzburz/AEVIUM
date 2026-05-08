import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { timelineEventsTable, projectsTable } from "@workspace/db";
import {
  ListTimelineEventsParams,
  CreateTimelineEventParams,
  CreateTimelineEventBody,
  UpdateTimelineEventParams,
  UpdateTimelineEventBody,
  DeleteTimelineEventParams,
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

router.get("/projects/:projectId/timeline", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListTimelineEventsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(eq(timelineEventsTable.projectId, params.data.projectId))
    .orderBy(asc(timelineEventsTable.orderIndex));
  res.json(events);
});

router.post("/projects/:projectId/timeline", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateTimelineEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateTimelineEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db
    .insert(timelineEventsTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(event);
});

router.patch("/projects/:projectId/timeline/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateTimelineEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UpdateTimelineEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db
    .update(timelineEventsTable)
    .set(parsed.data)
    .where(and(eq(timelineEventsTable.id, params.data.id), eq(timelineEventsTable.projectId, params.data.projectId)))
    .returning();
  if (!event) {
    res.status(404).json({ error: "Timeline event not found" });
    return;
  }
  res.json(event);
});

router.delete("/projects/:projectId/timeline/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteTimelineEventParams.safeParse(req.params);
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
    .delete(timelineEventsTable)
    .where(and(eq(timelineEventsTable.id, params.data.id), eq(timelineEventsTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Timeline event not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
