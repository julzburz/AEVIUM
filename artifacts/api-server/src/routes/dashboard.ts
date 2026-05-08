import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  booksTable,
  chaptersTable,
  scenesTable,
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
      const [booksCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(booksTable)
        .where(eq(booksTable.projectId, project.id));

      const chaptersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chaptersTable)
        .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
        .where(eq(booksTable.projectId, project.id));

      const scenesResult = await db
        .select({ totalWords: sql<number>`coalesce(sum(${scenesTable.wordCount}), 0)::int` })
        .from(scenesTable)
        .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
        .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
        .where(eq(booksTable.projectId, project.id));

      return {
        ...project,
        totalBooks: booksCount?.count ?? 0,
        totalChapters: chaptersResult[0]?.count ?? 0,
        totalWords: scenesResult[0]?.totalWords ?? 0,
      };
    }),
  );

  const recentActivity = (
    await db
      .select({
        type: sql<string>`'scene'`,
        projectId: projectsTable.id,
        projectName: projectsTable.name,
        entityName: scenesTable.title,
        updatedAt: scenesTable.updatedAt,
      })
      .from(scenesTable)
      .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
      .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
      .innerJoin(projectsTable, eq(booksTable.projectId, projectsTable.id))
      .where(eq(projectsTable.userId, userId))
      .orderBy(desc(scenesTable.updatedAt))
      .limit(10)
  );

  res.json({
    projects: projectsWithStats,
    totalProjects: projects.length,
    recentActivity,
  });
});

export default router;
