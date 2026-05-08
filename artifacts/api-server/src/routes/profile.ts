import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

const UpdateProfileBody = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  language: z.enum(["en", "es"]).optional(),
  displayName: z.string().nullish(),
  bio: z.string().nullish(),
});

router.get("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId))
    .limit(1);
  if (!profile) {
    res.json({ userId, theme: "dark", language: "es", displayName: null, bio: null });
    return;
  }
  res.json(profile);
});

router.put("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { theme, language, displayName, bio } = parsed.data;

  const [existing] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(profilesTable)
      .set({
        ...(theme !== undefined ? { theme } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
        ...(bio !== undefined ? { bio } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profilesTable.userId, userId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(profilesTable)
      .values({
        userId,
        theme: theme ?? "dark",
        language: language ?? "es",
        displayName: displayName ?? null,
        bio: bio ?? null,
      })
      .returning();
    res.json(created);
  }
});

export default router;
