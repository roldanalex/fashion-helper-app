"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { personSession } from "@/lib/people/session";

export async function updateSuggestionStatus(
  suggestionId: string,
  status: "suggested" | "saved" | "dismissed" | "purchased",
  personId: string,
) {
  const t = await getTranslations("shop");
  const session = await personSession(personId);
  if (!session) return { error: t("errors.personGone") };

  const ok = await session.wardrobe.setSuggestionStatus(suggestionId, status).catch(() => false);
  if (!ok) return { error: t("errors.couldNotUpdate") };

  revalidatePath("/shop");
  return { ok: true };
}
