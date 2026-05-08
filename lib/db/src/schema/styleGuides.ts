import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const narratorEnum = pgEnum("narrator_type", [
  "first_person", "third_limited", "third_omniscient", "second_person"
]);
export const tenseEnum = pgEnum("tense_type", ["past", "present"]);
export const povTypeEnum = pgEnum("pov_type", ["single", "multiple"]);
export const pacingEnum = pgEnum("pacing_type", ["slow", "medium", "fast"]);

export const styleGuidesTable = pgTable("style_guides", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique().references(() => projectsTable.id, { onDelete: "cascade" }),
  narrator: narratorEnum("narrator"),
  tense: tenseEnum("tense"),
  povType: povTypeEnum("pov_type"),
  tone: text("tone"),
  sensorDetailLevel: text("sensor_detail_level"),
  violenceLevel: text("violence_level"),
  introspectionLevel: text("introspection_level"),
  pacing: pacingEnum("pacing"),
  forbiddenWords: text("forbidden_words"),
  frequentWords: text("frequent_words"),
  dialogueRules: text("dialogue_rules"),
  povRules: text("pov_rules"),
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type StyleGuide = typeof styleGuidesTable.$inferSelect;
export type InsertStyleGuide = typeof styleGuidesTable.$inferInsert;
