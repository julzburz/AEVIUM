import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const timelineEventTypeEnum = pgEnum("timeline_event_type", [
  "death", "injury", "travel", "revelation", "conflict",
  "romance", "political", "worldbuilding", "other"
]);

export const timelineEventsTable = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  bookId: integer("book_id"),
  chapterId: integer("chapter_id"),
  sceneId: integer("scene_id"),
  characterId: integer("character_id"),
  eventType: timelineEventTypeEnum("event_type").notNull().default("other"),
  description: text("description").notNull(),
  dateLabel: text("date_label"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
export type InsertTimelineEvent = typeof timelineEventsTable.$inferInsert;
