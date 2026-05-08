import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const bookStatusEnum = pgEnum("book_status", ["draft", "in_progress", "completed", "archived"]);

export const booksTable = pgTable("books", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  position: integer("position").notNull().default(0),
  status: bookStatusEnum("status").notNull().default("draft"),
  synopsis: text("synopsis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Book = typeof booksTable.$inferSelect;
export type InsertBook = typeof booksTable.$inferInsert;
