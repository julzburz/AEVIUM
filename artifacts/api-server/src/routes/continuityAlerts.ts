import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { continuityAlertsTable, projectsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth.js";
import z from "zod";

const router: IRouter = Router();

const ProjectParams = z.object({ projectId: z.coerce.number() });
const AlertParams = z.object({ projectId: z.coerce.number(), id: z.coerce.number() });

async function verifyProject(projectId: number, userId: string) {
  const [p] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

router.get("/projects/:projectId/continuity-alerts", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const sceneId = req.query.sceneId ? Number(req.query.sceneId) : undefined;
  const conditions = [eq(continuityAlertsTable.projectId, params.data.projectId)];
  if (sceneId) conditions.push(eq(continuityAlertsTable.sceneId!, sceneId));

  const alerts = await db
    .select()
    .from(continuityAlertsTable)
    .where(and(...conditions))
    .orderBy(continuityAlertsTable.createdAt);

  res.json(alerts);
});

router.patch("/projects/:projectId/continuity-alerts/:id/resolve", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = AlertParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [alert] = await db
    .update(continuityAlertsTable)
    .set({ isResolved: true, resolvedAt: new Date() })
    .where(and(eq(continuityAlertsTable.id, params.data.id), eq(continuityAlertsTable.projectId, params.data.projectId)))
    .returning();

  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json(alert);
});

const DismissBody = z.object({ action: z.enum(["postponed", "ignored"]) });

router.patch("/projects/:projectId/continuity-alerts/:id/dismiss", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = AlertParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = DismissBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const project = await verifyProject(params.data.projectId, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [alert] = await db
    .update(continuityAlertsTable)
    .set({ dismissedAs: body.data.action })
    .where(and(eq(continuityAlertsTable.id, params.data.id), eq(continuityAlertsTable.projectId, params.data.projectId)))
    .returning();

  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json(alert);
});

export default router;
