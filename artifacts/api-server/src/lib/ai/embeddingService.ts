import { db } from "@workspace/db";
import { memoryItemsTable, charactersTable, locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { geminiProvider } from "./geminiProvider.js";

function memoryText(title: string, content: string): string {
  return `${title}: ${content}`.slice(0, 8000);
}

function characterText(name: string, role: string | null, desc: string | null, personality: string | null, motivations: string | null): string {
  return [name, role, desc, personality, motivations].filter(Boolean).join(". ").slice(0, 8000);
}

function locationText(name: string, desc: string | null, significance: string | null): string {
  return [name, desc, significance].filter(Boolean).join(". ").slice(0, 8000);
}

async function embed(text: string): Promise<number[] | null> {
  try {
    const vec = await geminiProvider.embedText(text);
    return vec.length > 0 ? vec : null;
  } catch {
    return null;
  }
}

export async function embedMemoryItem(id: number, title: string, content: string): Promise<void> {
  const vec = await embed(memoryText(title, content));
  if (!vec) return;
  await db.update(memoryItemsTable).set({ embedding: vec }).where(eq(memoryItemsTable.id, id));
}

export async function embedCharacter(id: number, name: string, role: string | null, physicalDescription: string | null, personality: string | null, motivations: string | null): Promise<void> {
  const vec = await embed(characterText(name, role, physicalDescription, personality, motivations));
  if (!vec) return;
  await db.update(charactersTable).set({ embedding: vec }).where(eq(charactersTable.id, id));
}

export async function embedLocation(id: number, name: string, description: string | null, significance: string | null): Promise<void> {
  const vec = await embed(locationText(name, description, significance));
  if (!vec) return;
  await db.update(locationsTable).set({ embedding: vec }).where(eq(locationsTable.id, id));
}

export async function buildQueryEmbedding(text: string): Promise<number[] | null> {
  return embed(text.slice(0, 8000));
}
