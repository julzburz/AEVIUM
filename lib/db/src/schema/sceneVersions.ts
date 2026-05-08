import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { scenesTable } from "./scenes";

export const sceneVersionsTable = pgTable("scene_versions", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").notNull().references(() => scenesTable.id, { onDelete: "cascade" }),
  content: text("content"),
  wordCount: integer("word_count").notNull().default(0),
  version: integer("version").notNull().default(1),
  userId: text("user_id").notNull(),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
});

export type SceneVersion = typeof sceneVersionsTable.$inferSelect;
export type InsertSceneVersion = typeof sceneVersionsTable.$inferInsert;
