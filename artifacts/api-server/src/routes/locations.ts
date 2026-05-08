import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { locationsTable, projectsTable } from "@workspace/db";
import {
  ListLocationsParams,
  CreateLocationParams,
  CreateLocationBody,
  UpdateLocationParams,
  UpdateLocationBody,
  DeleteLocationParams,
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

router.get("/projects/:projectId/locations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListLocationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const locations = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.projectId, params.data.projectId));
  res.json(locations);
});

router.post("/projects/:projectId/locations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateLocationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [location] = await db
    .insert(locationsTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(location);
});

router.patch("/projects/:projectId/locations/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateLocationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UpdateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [location] = await db
    .update(locationsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(locationsTable.id, params.data.id), eq(locationsTable.projectId, params.data.projectId)))
    .returning();
  if (!location) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  res.json(location);
});

router.delete("/projects/:projectId/locations/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteLocationParams.safeParse(req.params);
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
    .delete(locationsTable)
    .where(and(eq(locationsTable.id, params.data.id), eq(locationsTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
