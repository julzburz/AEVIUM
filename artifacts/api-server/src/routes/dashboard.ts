import { Router, type IRouter } from "express";
import { eq, sql, desc, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  booksTable,
  chaptersTable,
  scenesTable,
  continuityAlertsTable,
} from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);

  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.updatedAt));

  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const [booksCount, chaptersResult, scenesResult, alertsResult, lastSceneResult] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(booksTable)
          .where(eq(booksTable.projectId, project.id)),

        db
          .select({ count: sql<number>`count(*)::int` })
          .from(chaptersTable)
          .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
          .where(eq(booksTable.projectId, project.id)),

        db
          .select({
            totalWords: sql<number>`coalesce(sum(${scenesTable.wordCount}), 0)::int`,
            totalScenes: sql<number>`count(*)::int`,
          })
          .from(scenesTable)
          .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
          .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
          .where(eq(booksTable.projectId, project.id)),

        db
          .select({ count: sql<number>`count(*)::int` })
          .from(continuityAlertsTable)
          .where(
            and(
              eq(continuityAlertsTable.projectId, project.id),
              eq(continuityAlertsTable.isResolved, false)
            )
          ),

        db
          .select({
            id: scenesTable.id,
            title: scenesTable.title,
            chapterId: scenesTable.chapterId,
            updatedAt: scenesTable.updatedAt,
          })
          .from(scenesTable)
          .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
          .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
          .where(eq(booksTable.projectId, project.id))
          .orderBy(desc(scenesTable.updatedAt))
          .limit(1),
      ]);

      return {
        ...project,
        totalBooks: booksCount[0]?.count ?? 0,
        totalChapters: chaptersResult[0]?.count ?? 0,
        totalWords: scenesResult[0]?.totalWords ?? 0,
        totalScenes: scenesResult[0]?.totalScenes ?? 0,
        pendingAlerts: alertsResult[0]?.count ?? 0,
        lastScene: lastSceneResult[0] ?? null,
      };
    }),
  );

  // Global last edited scene across all projects (for "continue here" banner)
  const [globalLastScene] = await db
    .select({
      sceneId: scenesTable.id,
      sceneTitle: scenesTable.title,
      chapterId: scenesTable.chapterId,
      updatedAt: scenesTable.updatedAt,
      projectId: projectsTable.id,
      projectName: projectsTable.name,
    })
    .from(scenesTable)
    .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .innerJoin(projectsTable, eq(booksTable.projectId, projectsTable.id))
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(scenesTable.updatedAt))
    .limit(1);

  // Global stats
  const totalWords = projectsWithStats.reduce((acc, p) => acc + p.totalWords, 0);
  const totalScenes = projectsWithStats.reduce((acc, p) => acc + p.totalScenes, 0);
  const totalAlerts = projectsWithStats.reduce((acc, p) => acc + p.pendingAlerts, 0);

  res.json({
    projects: projectsWithStats,
    totalProjects: projects.length,
    lastEditedScene: globalLastScene ?? null,
    globalStats: {
      totalWords,
      totalScenes,
      totalProjects: projects.length,
      totalAlerts,
    },
  });
});

export default router;
