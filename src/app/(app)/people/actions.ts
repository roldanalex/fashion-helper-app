"use server";

import { validationMessage } from "@/i18n/validation-server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { ACTIVE_PERSON_COOKIE, personSession } from "@/lib/people/session";
import { managedPersonSchema } from "@/lib/people/schema";
import { deriveColorSeason } from "@/lib/personal/color-season";
import { FAMILY_MAX_PEOPLE } from "@/lib/constants";

/** Make another Person the one the app is dressing. */
export async function setActivePerson(personId: string) {
  const t = await getTranslations("people.errors");
  const session = await personSession(personId);
  if (!session) return { error: t("notOnAccount") };

  (await cookies()).set(ACTIVE_PERSON_COOKIE, personId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

function rowFrom(input: z.infer<typeof managedPersonSchema>) {
  const minor = input.age_band !== "adult";
  const p = input.personal;
  return {
    display_name: input.display_name,
    age_band: input.age_band,
    style_preferences: input.style_preferences,
    preferred_formality: input.preferred_formality,
    gender: p.gender ?? null,
    skin_tone: p.skin_tone ?? null,
    skin_undertone: p.skin_undertone ?? null,
    hair_color: p.hair_color ?? null,
    eye_color: p.eye_color ?? null,
    color_season: deriveColorSeason(p),
    fit_preference: p.fit_preference ?? null,
    // Minors: only the minimum is kept (the database enforces it too).
    height_cm: minor ? null : (p.height_cm ?? null),
    body_shape: minor ? null : (p.body_shape ?? null),
    style_notes: minor ? null : p.style_notes || null,
  };
}

/**
 * Add a Managed person (a child, or an adult without an account) to a Family
 * this Account owns or manages; by default its own.
 */
export async function addPerson(input: unknown, familyId?: string) {
  const t = await getTranslations("people.errors");
  const parsed = managedPersonSchema.safeParse(input);
  if (!parsed.success) return { error: await validationMessage(parsed.error.issues[0]?.message, t("checkDetails")) };

  const session = await personSession();
  if (!session) return { error: t("notSignedIn") };
  const self = session.people.find((p) => p.kind === "self");
  if (!self) return { error: t("accountNotSetUp") };
  let targetFamily = self.family_id;
  if (familyId && familyId !== self.family_id) {
    const { data: membership } = await session.supabase
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!membership || membership.role === "viewer") return { error: t("cannotAddToFamily") };
    targetFamily = familyId;
  }

  const { data, error } = await session.supabase
    .from("people")
    .insert({
      ...rowFrom(parsed.data),
      family_id: targetFamily,
      kind: "managed",
      account_user_id: null,
      created_by: session.user.id,
      guardian_attested_at: parsed.data.age_band === "adult" ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.error("addPerson failed:", error.message);
    return {
      error: error.message.includes("at most")
        ? t("familyFull", { max: FAMILY_MAX_PEOPLE })
        : t("couldNotAdd"),
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}

/** Edit a Managed person. A self Person is edited in the account's own settings. */
export async function updatePerson(personId: string, input: unknown) {
  const t = await getTranslations("people.errors");
  const parsed = managedPersonSchema.safeParse(input);
  if (!parsed.success) return { error: await validationMessage(parsed.error.issues[0]?.message, t("checkDetails")) };

  const session = await personSession();
  if (!session) return { error: t("notSignedIn") };
  const person = session.people.find((p) => p.id === personId && p.kind === "managed");
  if (!person) return { error: t("notOnAccount") };

  const { error } = await session.supabase
    .from("people")
    .update({
      ...rowFrom(parsed.data),
      guardian_attested_at:
        parsed.data.age_band === "adult"
          ? null
          : (person.guardian_attested_at ?? new Date().toISOString()),
    })
    .eq("id", personId);
  if (error) {
    console.error("updatePerson failed:", error.message);
    return { error: t("couldNotSave") };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Permanently delete a Managed person: their photos first, then the row
 * (pieces, outfits, plans and suggestions go with it by cascade).
 */
export async function deletePerson(personId: string) {
  const t = await getTranslations("people.errors");
  const session = await personSession();
  if (!session) return { error: t("notSignedIn") };
  const person = session.people.find((p) => p.id === personId && p.kind === "managed");
  if (!person) return { error: t("notOnAccount") };

  const wardrobe = session.wardrobeFor(personId)!;
  const [current, archived] = await Promise.all([
    wardrobe.pieces(),
    wardrobe.pieces({ archivedOnly: true }),
  ]);
  const paths = [...current, ...archived].map((p) => p.image_url);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await session.supabase.storage.from("wardrobe").remove(paths.slice(i, i + 100));
    if (error) {
      console.error("deletePerson photo removal failed:", error.message);
      return { error: t("couldNotDeletePhotos") };
    }
  }

  const { error } = await session.supabase.from("people").delete().eq("id", personId);
  if (error) {
    console.error("deletePerson failed:", error.message);
    return { error: t("couldNotDeleteProfile") };
  }

  if ((await cookies()).get(ACTIVE_PERSON_COOKIE)?.value === personId) {
    (await cookies()).delete(ACTIVE_PERSON_COOKIE);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
