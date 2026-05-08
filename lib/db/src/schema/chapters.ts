import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { booksTable } from "./books";

export const chapterStatusEnum = pgEnum("chapter_status", ["draft", "in_review", "ready", "blocked"]);

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  summary: text("summary"),
  status: chapterStatusEnum("status").notNull().default("draft"),
  wordCount: integer("word_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Chapter = typeof chaptersTable.$inferSelect;
export type InsertChapter = typeof chaptersTable.$inferInsert;
