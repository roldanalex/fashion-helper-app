"use server";

import { validationMessage } from "@/i18n/validation-server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { itemTagsSchema } from "@/lib/schemas";
import { personSession } from "@/lib/people/session";
import { CATEGORIES } from "@/lib/constants";
import { getTranslations } from "next-intl/server";

const newPieceSchema = z.object({
  id: z.uuid(),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(500).nullable(),
  imagePath: z.string().min(10).max(200),
  /** Skip AI tagging: the piece goes straight to "Review tags". */
  manual: z.boolean(),
});

/**
 * Records a piece whose photo the browser has just uploaded. The photo path
 * must sit in this Account's folder under this Person: {account}/{person}/{piece}.webp.
 */
export async function createPiece(personId: string, input: unknown) {
  const t = await getTranslations("wardrobe");
  const parsed = newPieceSchema.safeParse(input);
  if (!parsed.success) return { error: t("errors.couldNotAdd") };

  const session = await personSession(personId);
  if (!session) return { error: t("errors.personGone") };

  const { id, category, description, imagePath, manual } = parsed.data;
  if (imagePath !== `${session.user.id}/${personId}/${id}.webp`) {
    return { error: t("errors.couldNotAdd") };
  }

  try {
    await session.wardrobe.addPiece({
      id,
      category,
      description,
      image_url: imagePath,
      ...(manual ? { name: description?.slice(0, 60) || t("newPiece") } : {}),
    });
    if (manual) await session.wardrobe.updatePiece(id, { ai_status: "tagged" });
  } catch {
    return { error: t("errors.couldNotAdd") };
  }

  revalidatePath("/wardrobe");
  return { ok: true };
}

export async function confirmItemTags(itemId: string, personId: string, tags: unknown) {
  const t = await getTranslations("wardrobe");
  const parsed = itemTagsSchema.safeParse(tags);
  if (!parsed.success) {
    return { error: await validationMessage(parsed.error.issues[0]?.message, t("errors.invalidTags")) };
  }

  const session = await personSession(personId);
  if (!session) return { error: t("errors.personGone") };

  const ok = await session.wardrobe
    .updatePiece(itemId, { ...parsed.data, ai_status: "confirmed", combo_status: "queued" })
    .catch(() => false);
  if (!ok) return { error: t("errors.couldNotSave") };

  revalidatePath("/wardrobe");
  return { ok: true };
}

export async function archiveItem(itemId: string, personId: string) {
  return setArchived(itemId, personId, true);
}

/** Undo for archiveItem: puts the piece back in the wardrobe. */
export async function unarchiveItem(itemId: string, personId: string) {
  return setArchived(itemId, personId, false);
}

async function setArchived(itemId: string, personId: string, archived: boolean) {
  const t = await getTranslations("wardrobe");
  const session = await personSession(personId);
  if (!session) return { error: t("errors.personGone") };

  const ok = await session.wardrobe.updatePiece(itemId, { archived }).catch(() => false);
  if (!ok) {
    return {
      error: archived
        ? t("errors.couldNotArchive")
        : t("errors.couldNotRestore"),
    };
  }

  revalidatePath("/wardrobe");
  return { ok: true };
}
