import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const characterRoleEnum = pgEnum("character_role", ["protagonist", "antagonist", "secondary", "minor"]);

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: characterRoleEnum("role").notNull().default("secondary"),
  physicalDescription: text("physical_description"),
  personality: text("personality"),
  motivations: text("motivations"),
  currentState: text("current_state"),
  knowledgeState: text("knowledge_state"),
  injuries: text("injuries"),
  secrets: text("secrets"),
  relationships: text("relationships"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Character = typeof charactersTable.$inferSelect;
export type InsertCharacter = typeof charactersTable.$inferInsert;
