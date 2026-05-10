import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { projectsTable, booksTable, chaptersTable, scenesTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<hr\s*\/?>/gi, "\n* * *\n\n")
    .replace(/<blockquote>/gi, "")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

router.get("/projects/:id/export", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const projectId = Number(req.params.id);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project || project.userId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const books = await db.select().from(booksTable)
    .where(eq(booksTable.projectId, projectId))
    .orderBy(asc(booksTable.position));

  const sep = "=".repeat(60);
  const dashSep = "-".repeat(40);
  let output = `${project.name.toUpperCase()}\n${sep}\n\n`;

  for (const book of books) {
    output += `${book.title}\n${dashSep}\n\n`;

    const chapters = await db.select().from(chaptersTable)
      .where(eq(chaptersTable.bookId, book.id))
      .orderBy(asc(chaptersTable.position));

    for (const chapter of chapters) {
      output += `${chapter.title.toUpperCase()}\n\n`;

      const scenes = await db.select().from(scenesTable)
        .where(eq(scenesTable.chapterId, chapter.id))
        .orderBy(asc(scenesTable.position));

      for (const scene of scenes) {
        if (scene.content) {
          const text = stripHtml(scene.content);
          if (text) output += `${text}\n\n`;
        }
      }
    }
  }

  const filename = `${project.name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.txt`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(output);
});

export default router;
