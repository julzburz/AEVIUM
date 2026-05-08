import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { chaptersTable } from "./chapters";

export const sceneStatusEnum = pgEnum("scene_status", [
  "draft", "in_review", "ready", "blocked", "needs_rewrite", "needs_continuity"
]);

export const scenesTable = pgTable("scenes", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  content: text("content"),
  summary: text("summary"),
  povCharacterId: integer("pov_character_id"),
  locationId: integer("location_id"),
  timelinePosition: text("timeline_position"),
  narrativeGoal: text("narrative_goal"),
  wordCount: integer("word_count").notNull().default(0),
  status: sceneStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Scene = typeof scenesTable.$inferSelect;
export type InsertScene = typeof scenesTable.$inferInsert;
