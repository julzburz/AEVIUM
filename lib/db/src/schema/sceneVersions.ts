import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { scenesTable } from "./scenes";

export const sceneVersionStatusEnum = pgEnum("scene_version_status", [
  "pending", "accepted", "rejected"
]);

export const sceneVersionsTable = pgTable("scene_versions", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").notNull().references(() => scenesTable.id, { onDelete: "cascade" }),
  originalContent: text("original_content"),
  userInstruction: text("user_instruction"),
  proposedContent: text("proposed_content"),
  status: sceneVersionStatusEnum("status").notNull().default("pending"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SceneVersion = typeof sceneVersionsTable.$inferSelect;
export type InsertSceneVersion = typeof sceneVersionsTable.$inferInsert;
