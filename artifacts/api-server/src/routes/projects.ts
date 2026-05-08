import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  booksTable,
  chaptersTable,
  scenesTable,
  charactersTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectParams,
  UpdateProjectBody,
  GetProjectParams,
  DeleteProjectParams,
  GetProjectSummaryParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.updatedAt));
  res.json(projects);
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(project);
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.patch("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.delete("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/projects/:id/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetProjectSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [booksCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booksTable)
    .where(eq(booksTable.projectId, params.data.id));

  const chaptersResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chaptersTable)
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .where(eq(booksTable.projectId, params.data.id));

  const scenesResult = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalWords: sql<number>`coalesce(sum(${scenesTable.wordCount}), 0)::int`,
    })
    .from(scenesTable)
    .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .where(eq(booksTable.projectId, params.data.id));

  const [charsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(charactersTable)
    .where(eq(charactersTable.projectId, params.data.id));

  res.json({
    projectId: params.data.id,
    totalBooks: booksCount?.count ?? 0,
    totalChapters: chaptersResult[0]?.count ?? 0,
    totalScenes: scenesResult[0]?.count ?? 0,
    totalWords: scenesResult[0]?.totalWords ?? 0,
    totalCharacters: charsCount?.count ?? 0,
    lastEditedAt: project.updatedAt,
  });
});

export default router;
