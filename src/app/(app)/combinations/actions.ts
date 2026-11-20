"use server";

import { revalidatePath } from "next/cache";
import { personSession } from "@/lib/people/session";
import { getTranslations } from "next-intl/server";

async function setFlag(
  combinationId: string,
  flag: "boosted" | "hidden",
  value: boolean,
) {
  const t = await getTranslations("outfits.errors");
  const session = await personSession();
  if (!session) return { error: t("notSignedIn") };

  const ok = await session.wardrobe
    .updateOutfit(combinationId, { [flag]: value })
    .catch(() => false);
  if (!ok) return { error: t("couldNotUpdate") };

  revalidatePath("/combinations");
  return { ok: true };
}

export async function toggleBoost(combinationId: string, value: boolean) {
  return setFlag(combinationId, "boosted", value);
}

export async function toggleHide(combinationId: string, value: boolean) {
  return setFlag(combinationId, "hidden", value);
}
