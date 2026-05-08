import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const aiProviderEnum = pgEnum("ai_provider", ["openai", "anthropic", "gemini", "mistral"]);

export const aiCredentialsTable = pgTable("ai_credentials", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  provider: aiProviderEnum("provider").notNull().default("openai"),
  model: text("model"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AiCredential = typeof aiCredentialsTable.$inferSelect;
export type InsertAiCredential = typeof aiCredentialsTable.$inferInsert;
