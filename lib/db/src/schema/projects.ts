import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const projectTypeEnum = pgEnum("project_type", ["novel", "saga", "articles", "screenplay", "other"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived", "completed"]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: projectTypeEnum("type").notNull().default("novel"),
  primaryLanguage: text("primary_language").notNull().default("en"),
  status: projectStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
