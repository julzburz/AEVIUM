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
import { eq, and, asc, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { NarrativeContext } from "./types.js";
import { buildQueryEmbedding } from "./embeddingService.js";

/**
 * Verifies that sceneId belongs to projectId via the scene→chapter→book chain,
 * without requiring chapterId. Use for endpoints that only receive sceneId + projectId.
 */
export async function verifySceneInProject(
  sceneId: number,
  projectId: number
): Promise<boolean> {
  const [row] = await db
    .select({ sceneId: scenesTable.id })
    .from(scenesTable)
    .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .where(and(eq(scenesTable.id, sceneId), eq(booksTable.projectId, projectId)))
    .limit(1);
  return !!row;
}

/**
 * Verifies that the given sceneId belongs to chapterId AND chapterId belongs to projectId
 * via the book chain. Returns true if ownership is valid.
 */
export async function verifySceneOwnership(
  sceneId: number,
  chapterId: number,
  projectId: number
): Promise<boolean> {
  const [row] = await db
    .select({ sceneId: scenesTable.id })
    .from(scenesTable)
    .innerJoin(chaptersTable, eq(scenesTable.chapterId, chaptersTable.id))
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .where(
      and(
        eq(scenesTable.id, sceneId),
        eq(scenesTable.chapterId, chapterId),
        eq(chaptersTable.id, chapterId),
        eq(booksTable.projectId, projectId)
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Verifies that chapterId belongs to projectId via the book chain.
 */
export async function verifyChapterOwnership(
  chapterId: number,
  projectId: number
): Promise<boolean> {
  const [row] = await db
    .select({ chapterId: chaptersTable.id })
    .from(chaptersTable)
    .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
    .where(and(eq(chaptersTable.id, chapterId), eq(booksTable.projectId, projectId)))
    .limit(1);
  return !!row;
}

/**
 * Fetches the most relevant characters for a project using semantic similarity
 * if a query embedding is available, otherwise falls back to top-N.
 */
async function fetchRelevantCharacters(projectId: number, queryEmbedding: number[] | null) {
  if (queryEmbedding) {
    const vecStr = `[${queryEmbedding.join(",")}]`;
    const semantic = await db
      .select({ name: charactersTable.name, role: charactersTable.role, description: charactersTable.physicalDescription })
      .from(charactersTable)
      .where(and(eq(charactersTable.projectId, projectId), isNotNull(charactersTable.embedding)))
      .orderBy(sql`${charactersTable.embedding} <=> ${vecStr}::vector`)
      .limit(15);
    if (semantic.length > 0) return semantic;
  }
  return db
    .select({ name: charactersTable.name, role: charactersTable.role, description: charactersTable.physicalDescription })
    .from(charactersTable)
    .where(eq(charactersTable.projectId, projectId))
    .limit(20);
}

/**
 * Fetches the most relevant locations using semantic similarity or top-N fallback.
 */
async function fetchRelevantLocations(projectId: number, queryEmbedding: number[] | null) {
  if (queryEmbedding) {
    const vecStr = `[${queryEmbedding.join(",")}]`;
    const semantic = await db
      .select({ name: locationsTable.name, description: locationsTable.description })
      .from(locationsTable)
      .where(and(eq(locationsTable.projectId, projectId), isNotNull(locationsTable.embedding)))
      .orderBy(sql`${locationsTable.embedding} <=> ${vecStr}::vector`)
      .limit(8);
    if (semantic.length > 0) return semantic;
  }
  return db
    .select({ name: locationsTable.name, description: locationsTable.description })
    .from(locationsTable)
    .where(eq(locationsTable.projectId, projectId))
    .limit(10);
}

/**
 * Fetches the most relevant canonical memory items using semantic similarity or top-N fallback.
 * Exported so other endpoints (e.g. check-contradiction) can reuse the same semantic logic.
 */
export async function fetchRelevantMemory(projectId: number, queryEmbedding: number[] | null) {
  if (queryEmbedding) {
    const vecStr = `[${queryEmbedding.join(",")}]`;
    const semantic = await db
      .select({ type: memoryItemsTable.type, title: memoryItemsTable.title, content: memoryItemsTable.content, status: memoryItemsTable.status })
      .from(memoryItemsTable)
      .where(and(
        eq(memoryItemsTable.projectId, projectId),
        eq(memoryItemsTable.status, "canonical"),
        isNotNull(memoryItemsTable.embedding)
      ))
      .orderBy(sql`${memoryItemsTable.embedding} <=> ${vecStr}::vector`)
      .limit(25);
    if (semantic.length > 0) return semantic;
  }
  return db
    .select({ type: memoryItemsTable.type, title: memoryItemsTable.title, content: memoryItemsTable.content, status: memoryItemsTable.status })
    .from(memoryItemsTable)
    .where(and(eq(memoryItemsTable.projectId, projectId), eq(memoryItemsTable.status, "canonical")))
    .limit(40);
}

export async function assembleContext(
  sceneId: number,
  chapterId: number,
  projectId: number,
  queryText?: string
): Promise<NarrativeContext> {
  const queryEmbedding = queryText ? await buildQueryEmbedding(queryText) : null;

  const [scene, chapter, characters, locations, memoryItems, styleGuide] = await Promise.all([
    db.select().from(scenesTable)
      .where(and(eq(scenesTable.id, sceneId), eq(scenesTable.chapterId, chapterId)))
      .limit(1),
    db
      .select({
        id: chaptersTable.id,
        title: chaptersTable.title,
        bookId: chaptersTable.bookId,
        position: chaptersTable.position,
      })
      .from(chaptersTable)
      .innerJoin(booksTable, eq(chaptersTable.bookId, booksTable.id))
      .where(and(eq(chaptersTable.id, chapterId), eq(booksTable.projectId, projectId)))
      .limit(1),
    fetchRelevantCharacters(projectId, queryEmbedding),
    fetchRelevantLocations(projectId, queryEmbedding),
    fetchRelevantMemory(projectId, queryEmbedding),
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
    lines.push(isEs ? "\n--- PERSONAJES RELEVANTES ---" : "\n--- RELEVANT CHARACTERS ---");
    ctx.characters.forEach((c) => {
      lines.push(`• ${c.name}${c.role ? ` (${c.role})` : ""}${c.description ? `: ${c.description.slice(0, 120)}` : ""}`);
    });
  }

  if (ctx.locations && ctx.locations.length > 0) {
    lines.push(isEs ? "\n--- LUGARES RELEVANTES ---" : "\n--- RELEVANT LOCATIONS ---");
    ctx.locations.forEach((l) => {
      lines.push(`• ${l.name}${l.description ? `: ${l.description.slice(0, 80)}` : ""}`);
    });
  }

  if (ctx.memoryItems && ctx.memoryItems.length > 0) {
    lines.push(isEs ? "\n--- MEMORIA NARRATIVA CANÓNICA RELEVANTE ---" : "\n--- RELEVANT CANONICAL NARRATIVE MEMORY ---");
    ctx.memoryItems.forEach((m) => {
      lines.push(`[${m.type}] ${m.title}: ${m.content.slice(0, 150)}`);
    });
  }

  if (ctx.previousScene) {
    lines.push(isEs ? "\n--- ESCENA ANTERIOR ---" : "\n--- PREVIOUS SCENE ---");
    if (ctx.previousScene.title) lines.push(isEs ? `Título: ${ctx.previousScene.title}` : `Title: ${ctx.previousScene.title}`);
    if (ctx.previousScene.summary) lines.push(isEs ? `Resumen: ${ctx.previousScene.summary}` : `Summary: ${ctx.previousScene.summary}`);
    if (ctx.previousScene.content) lines.push(ctx.previousScene.content.slice(-800));
  }

  if (ctx.nextScene) {
    lines.push(isEs ? "\n--- ESCENA SIGUIENTE (esbozo) ---" : "\n--- NEXT SCENE (outline) ---");
    if (ctx.nextScene.title) lines.push(isEs ? `Título: ${ctx.nextScene.title}` : `Title: ${ctx.nextScene.title}`);
    if (ctx.nextScene.summary) lines.push(ctx.nextScene.summary);
  }

  return lines.join("\n");
}
