import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { scenesTable } from "./scenes";

export const continuityAlertSeverityEnum = pgEnum("continuity_alert_severity", [
  "info", "warning", "error"
]);

export const continuityAlertsTable = pgTable("continuity_alerts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  severity: continuityAlertSeverityEnum("severity").notNull().default("info"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContinuityAlert = typeof continuityAlertsTable.$inferSelect;
export type InsertContinuityAlert = typeof continuityAlertsTable.$inferInsert;
