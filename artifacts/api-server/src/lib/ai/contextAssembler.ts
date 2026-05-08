import { db } from "@workspace/db";
import {
  scenesTable,
  chaptersTable,
  booksTable,
  projectsTable,
  charactersTable,
  locationsTable,
  memoryItemsTable,
  styleGuidesTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import type { NarrativeContext } from "./types.js";

export async function assembleContext(
  sceneId: number,
  chapterId: number,
  projectId: number
): Promise<NarrativeContext> {
  const [scene, chapter, characters, locations, memoryItems, styleGuide] = await Promise.all([
    db.select().from(scenesTable).where(eq(scenesTable.id, sceneId)).limit(1),
    db
      .select({
        id: chaptersTable.id,
        title: chaptersTable.title,
        bookId: chaptersTable.bookId,
        position: chaptersTable.position,
      })
      .from(chaptersTable)
      .where(eq(chaptersTable.id, chapterId))
      .limit(1),
    db
      .select({ name: charactersTable.name, role: charactersTable.role, description: charactersTable.physicalDescription })
      .from(charactersTable)
      .where(eq(charactersTable.projectId, projectId))
      .limit(20),
    db
      .select({ name: locationsTable.name, description: locationsTable.description })
      .from(locationsTable)
      .where(eq(locationsTable.projectId, projectId))
      .limit(10),
    db
      .select({ type: memoryItemsTable.type, title: memoryItemsTable.title, content: memoryItemsTable.content, status: memoryItemsTable.status })
      .from(memoryItemsTable)
      .where(and(eq(memoryItemsTable.projectId, projectId), eq(memoryItemsTable.status, "canonical")))
      .limit(40),
    db.select().from(styleGuidesTable).where(eq(styleGuidesTable.projectId, projectId)).limit(1),
  ]);

  const ctx: NarrativeContext = {
    sceneContent: scene[0]?.content ?? undefined,
    sceneTitle: scene[0]?.title,
    sceneSummary: scene[0]?.summary ?? undefined,
    characters,
    locations,
    memoryItems,
  };

  if (chapter[0]) {
    ctx.chapterTitle = chapter[0].title;
    const book = await db
      .select({ id: booksTable.id, title: booksTable.title })
      .from(booksTable)
      .where(eq(booksTable.id, chapter[0].bookId))
      .limit(1);
    if (book[0]) {
      ctx.bookTitle = book[0].title;
      const project = await db
        .select({ name: projectsTable.name })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId))
        .limit(1);
      ctx.projectName = project[0]?.name;
    }

    const allScenes = await db
      .select({ id: scenesTable.id, title: scenesTable.title, content: scenesTable.content, summary: scenesTable.summary, position: scenesTable.position })
      .from(scenesTable)
      .where(eq(scenesTable.chapterId, chapterId))
      .orderBy(asc(scenesTable.position));

    const currentIdx = allScenes.findIndex((s) => s.id === sceneId);
    if (currentIdx > 0) {
      const prev = allScenes[currentIdx - 1];
      ctx.previousScene = { title: prev.title, content: prev.content, summary: prev.summary };
    }
    if (currentIdx >= 0 && currentIdx < allScenes.length - 1) {
      const next = allScenes[currentIdx + 1];
      ctx.nextScene = { title: next.title, summary: next.summary };
    }
  }

  if (styleGuide[0]) {
    ctx.styleGuide = {
      narrator: styleGuide[0].narrator,
      tense: styleGuide[0].tense,
      tone: styleGuide[0].tone,
      forbiddenWords: styleGuide[0].forbiddenWords,
      frequentWords: styleGuide[0].frequentWords,
      dialogueRules: styleGuide[0].dialogueRules,
      pacing: styleGuide[0].pacing,
    };
  }

  return ctx;
}

export function buildSystemPrompt(ctx: NarrativeContext, language = "es"): string {
  const isEs = language === "es";
  const lines: string[] = [];

  lines.push(isEs
    ? "Eres AEVIUM, un asistente de escritura narrativa especializado en ficción literaria de alta calidad."
    : "You are AEVIUM, a narrative writing assistant specialized in high-quality literary fiction.");

  if (ctx.projectName) lines.push(isEs ? `Proyecto: ${ctx.projectName}` : `Project: ${ctx.projectName}`);
  if (ctx.bookTitle) lines.push(isEs ? `Libro: ${ctx.bookTitle}` : `Book: ${ctx.bookTitle}`);
  if (ctx.chapterTitle) lines.push(isEs ? `Capítulo: ${ctx.chapterTitle}` : `Chapter: ${ctx.chapterTitle}`);
  if (ctx.sceneTitle) lines.push(isEs ? `Escena: ${ctx.sceneTitle}` : `Scene: ${ctx.sceneTitle}`);

  if (ctx.styleGuide) {
    const sg = ctx.styleGuide;
    lines.push(isEs ? "\n--- GUÍA DE ESTILO ---" : "\n--- STYLE GUIDE ---");
    if (sg.narrator) lines.push(`Narrador: ${sg.narrator}`);
    if (sg.tense) lines.push(`Tiempo verbal: ${sg.tense}`);
    if (sg.tone) lines.push(`Tono: ${sg.tone}`);
    if (sg.pacing) lines.push(`Ritmo: ${sg.pacing}`);
    if (sg.forbiddenWords) lines.push(`Palabras prohibidas: ${sg.forbiddenWords}`);
    if (sg.frequentWords) lines.push(`Palabras características: ${sg.frequentWords}`);
    if (sg.dialogueRules) lines.push(`Reglas de diálogo: ${sg.dialogueRules}`);
  }

  if (ctx.characters && ctx.characters.length > 0) {
    lines.push(isEs ? "\n--- PERSONAJES ---" : "\n--- CHARACTERS ---");
    ctx.characters.forEach((c) => {
      lines.push(`• ${c.name}${c.role ? ` (${c.role})` : ""}${c.description ? `: ${c.description.slice(0, 120)}` : ""}`);
    });
  }

  if (ctx.locations && ctx.locations.length > 0) {
    lines.push(isEs ? "\n--- LUGARES ---" : "\n--- LOCATIONS ---");
    ctx.locations.forEach((l) => {
      lines.push(`• ${l.name}${l.description ? `: ${l.description.slice(0, 80)}` : ""}`);
    });
  }

  if (ctx.memoryItems && ctx.memoryItems.length > 0) {
    lines.push(isEs ? "\n--- MEMORIA NARRATIVA CANÓNICA ---" : "\n--- CANONICAL NARRATIVE MEMORY ---");
    ctx.memoryItems.forEach((m) => {
      lines.push(`[${m.type}] ${m.title}: ${m.content.slice(0, 150)}`);
    });
  }

  if (ctx.previousScene) {
    lines.push(isEs ? "\n--- ESCENA ANTERIOR ---" : "\n--- PREVIOUS SCENE ---");
    lines.push(`Título: ${ctx.previousScene.title}`);
    if (ctx.previousScene.summary) lines.push(`Resumen: ${ctx.previousScene.summary}`);
    else if (ctx.previousScene.content) lines.push(`Fragmento: ${ctx.previousScene.content.slice(0, 300)}…`);
  }

  if (ctx.nextScene) {
    lines.push(isEs ? "\n--- ESCENA SIGUIENTE (referencia) ---" : "\n--- NEXT SCENE (reference) ---");
    lines.push(`Título: ${ctx.nextScene.title}`);
    if (ctx.nextScene.summary) lines.push(`Resumen: ${ctx.nextScene.summary}`);
  }

  lines.push(isEs
    ? "\nResponde SOLO con el texto narrativo solicitado. Sin explicaciones, sin metadatos."
    : "\nRespond ONLY with the requested narrative text. No explanations, no metadata.");

  return lines.join("\n");
}
