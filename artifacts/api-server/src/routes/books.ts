import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { booksTable, projectsTable } from "@workspace/db";
import {
  ListBooksParams,
  CreateBookParams,
  CreateBookBody,
  GetBookParams,
  UpdateBookParams,
  UpdateBookBody,
  DeleteBookParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/projects/:projectId/books", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListBooksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const books = await db
    .select()
    .from(booksTable)
    .where(eq(booksTable.projectId, params.data.projectId))
    .orderBy(asc(booksTable.position));
  res.json(books);
});

router.post("/projects/:projectId/books", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [book] = await db
    .insert(booksTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(book);
});

router.get("/projects/:projectId/books/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [book] = await db
    .select()
    .from(booksTable)
    .where(and(eq(booksTable.id, params.data.id), eq(booksTable.projectId, params.data.projectId)));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.json(book);
});

router.patch("/projects/:projectId/books/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = UpdateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [book] = await db
    .update(booksTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(booksTable.id, params.data.id), eq(booksTable.projectId, params.data.projectId)))
    .returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.json(book);
});

router.delete("/projects/:projectId/books/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [deleted] = await db
    .delete(booksTable)
    .where(and(eq(booksTable.id, params.data.id), eq(booksTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
