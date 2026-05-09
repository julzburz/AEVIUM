import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { vector } from "./vectorType";

export const memoryItemTypeEnum = pgEnum("memory_item_type", [
  "event", "injury", "secret", "relationship", "death", "promise",
  "mystery", "location_change", "knowledge", "other"
]);

export const memoryScopeEnum = pgEnum("memory_scope", ["global", "book", "chapter", "scene"]);
export const memoryStatusEnum = pgEnum("memory_status", ["suggested", "canonical", "discarded"]);

export const memoryItemsTable = pgTable("memory_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  type: memoryItemTypeEnum("type").notNull().default("other"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  scope: memoryScopeEnum("scope").notNull().default("global"),
  status: memoryStatusEnum("status").notNull().default("suggested"),
  confidence: integer("confidence"),
  sourceSceneId: integer("source_scene_id"),
  embedding: vector("embedding", 768),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MemoryItem = typeof memoryItemsTable.$inferSelect;
export type InsertMemoryItem = typeof memoryItemsTable.$inferInsert;
