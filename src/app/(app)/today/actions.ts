"use server";

import { getTranslations } from "next-intl/server";
import { personSession } from "@/lib/people/session";

/** Record what was actually worn: plan link, freshness, per-piece wear stats. */
export async function markWorn(planId: string, combinationId: string, personId: string) {
  const t = await getTranslations("today");
  const session = await personSession(personId);
  if (!session) return { error: t("errors.personGone") };

  const ok = await session.wardrobe.recordWorn(planId, combinationId).catch(() => false);
  if (!ok) return { error: t("errors.couldNotRecord") };
  return { ok: true };
}
