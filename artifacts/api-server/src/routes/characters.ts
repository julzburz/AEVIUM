import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { charactersTable, projectsTable } from "@workspace/db";
import {
  ListCharactersParams,
  CreateCharacterParams,
  CreateCharacterBody,
  UpdateCharacterParams,
  UpdateCharacterBody,
  DeleteCharacterParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import { embedCharacter } from "../lib/ai/embeddingService.js";

const router: IRouter = Router();

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return project ?? null;
}

router.get("/projects/:projectId/characters", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ListCharactersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.projectId, params.data.projectId));
  res.json(characters);
});

router.post("/projects/:projectId/characters", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [character] = await db
    .insert(charactersTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(character);
  embedCharacter(character.id, character.name, character.role, character.physicalDescription, character.personality, character.motivations).catch(() => {});
});

router.patch("/projects/:projectId/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = UpdateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [character] = await db
    .update(charactersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.projectId, params.data.projectId)))
    .returning();
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  res.json(character);
  embedCharacter(character.id, character.name, character.role, character.physicalDescription, character.personality, character.motivations).catch(() => {});
});

router.delete("/projects/:projectId/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await verifyProjectOwnership(params.data.projectId, userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [deleted] = await db
    .delete(charactersTable)
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
