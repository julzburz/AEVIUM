import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { chaptersTable, booksTable, projectsTable } from "@workspace/db";
import {
  ListChaptersParams,
  CreateChapterParams,
  CreateChapterBody,
  GetChapterParams,
  UpdateChapterParams,
  UpdateChapterBody,
  DeleteChapterParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

async function verifyBookOwnership(bookId: number, userId: string) {
  const [book] = await db
    .select({ id: booksTable.id })
    .from(booksTable)
    .innerJoin(projectsTable, eq(booksTable.projectId, projectsTable.id))
    .where(and(eq(booksTable.id, bookId), eq(projectsTable.userId, userId)));
  return book ?? null;
}

router.get("/books/:bookId/chapters", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListChaptersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const book = await verifyBookOwnership(params.data.bookId, userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.bookId, params.data.bookId))
    .orderBy(asc(chaptersTable.position));
  res.json(chapters);
});

router.post("/books/:bookId/chapters", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateChapterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const book = await verifyBookOwnership(params.data.bookId, userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const parsed = CreateChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [chapter] = await db
    .insert(chaptersTable)
    .values({ ...parsed.data, bookId: params.data.bookId })
    .returning();
  res.status(201).json(chapter);
});

router.get("/books/:bookId/chapters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetChapterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const book = await verifyBookOwnership(params.data.bookId, userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(and(eq(chaptersTable.id, params.data.id), eq(chaptersTable.bookId, params.data.bookId)));
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }
  res.json(chapter);
});

router.patch("/books/:bookId/chapters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateChapterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const book = await verifyBookOwnership(params.data.bookId, userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const parsed = UpdateChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [chapter] = await db
    .update(chaptersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(chaptersTable.id, params.data.id), eq(chaptersTable.bookId, params.data.bookId)))
    .returning();
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }
  res.json(chapter);
});

router.delete("/books/:bookId/chapters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteChapterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const book = await verifyBookOwnership(params.data.bookId, userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const [deleted] = await db
    .delete(chaptersTable)
    .where(and(eq(chaptersTable.id, params.data.id), eq(chaptersTable.bookId, params.data.bookId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
