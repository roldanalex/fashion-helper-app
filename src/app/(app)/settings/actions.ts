"use server";

import { validationMessage } from "@/i18n/validation-server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { geocode } from "@/lib/weather";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { personalSchema } from "@/lib/schemas";
import { deriveColorSeason } from "@/lib/personal/color-season";

const settingsSchema = z.object({
  style_preferences: z
    .array(z.enum(STYLE_PREFERENCES.map((s) => s.value) as [string, ...string[]]))
    .min(1),
  preferred_formality: z.number().int().min(1).max(10),
  home_location: z.string().trim().min(2),
  lifestyle_tags: z.array(z.string().max(40)).max(12).optional(),
});

export async function updateSettings(input: unknown) {
  const t = await getTranslations("settings.errors");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.path[0] === "home_location" ? t("homeCity") : t("invalidSettings") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn") };

  let home_lat: number | null = null;
  let home_lon: number | null = null;
  let home_location = parsed.data.home_location;
  try {
    const geo = await geocode(home_location);
    if (geo) {
      home_lat = geo.lat;
      home_lon = geo.lon;
      home_location = [geo.name, geo.state, geo.country]
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    // Save the raw text; geocode again next time.
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, home_location, home_lat, home_lon })
    .eq("id", user.id);
  if (error) return { error: t("couldNotSaveSettings") };

  revalidatePath("/settings");
  return { ok: true };
}

const unitsSchema = z.enum(["metric", "imperial"]);

/** Temperature unit, saved the moment the user picks it (Settings or the Today weather chip). */
export async function updateUnits(input: unknown) {
  const t = await getTranslations("settings.errors");
  const parsed = unitsSchema.safeParse(input);
  if (!parsed.success) return { error: t("chooseTempUnit") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn") };

  const { error } = await supabase
    .from("profiles")
    .update({ units: parsed.data })
    .eq("id", user.id);
  if (error) return { error: t("couldNotSaveTempUnit") };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Build, colouring, fit and notes. Every field is optional; the colour season
 * is derived here so prompts and Settings agree. Outfit scores are untouched:
 * these shape ranking and the stylist's choices, not the stored table.
 */
export async function updatePersonal(input: unknown) {
  const t = await getTranslations("settings.errors");
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: await validationMessage(parsed.error.issues[0]?.message, t("checkDetails")) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn") };

  const d = parsed.data;
  const row = {
    gender: d.gender ?? null,
    age_range: d.age_range ?? null,
    height_cm: d.height_cm ?? null,
    weight_kg: d.weight_kg ?? null,
    body_shape: d.body_shape ?? null,
    skin_tone: d.skin_tone ?? null,
    skin_undertone: d.skin_undertone ?? null,
    hair_color: d.hair_color ?? null,
    eye_color: d.eye_color ?? null,
    fit_preference: d.fit_preference ?? null,
    style_notes: d.style_notes || null,
    color_season: deriveColorSeason(d),
  };

  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) {
    // Most likely cause: migration 0010 has not been run yet.
    console.error("updatePersonal failed:", error.message);
    return { error: t("couldNotSaveDetails") };
  }

  revalidatePath("/settings");
  return { ok: true };
}

/** Clears every personal characteristic in one go. */
export async function clearPersonal() {
  return updatePersonal({
    gender: null,
    age_range: null,
    height_cm: null,
    weight_kg: null,
    body_shape: null,
    skin_tone: null,
    skin_undertone: null,
    hair_color: null,
    eye_color: null,
    fit_preference: null,
    style_notes: null,
  });
}

const measuresSchema = z.object({ weight: z.enum(["kg", "lb"]), height: z.enum(["cm", "ftin"]) });

/** Weight and height units, saved the moment the user picks them. */
export async function updateMeasureUnits(input: unknown) {
  const t = await getTranslations("settings.errors");
  const parsed = measuresSchema.safeParse(input);
  if (!parsed.success) return { error: t("chooseMeasureUnits") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn") };

  const { error } = await supabase
    .from("profiles")
    .update({ weight_unit: parsed.data.weight, height_unit: parsed.data.height })
    .eq("id", user.id);
  if (error) {
    console.error("updateMeasureUnits failed (has migration 0013 been run?):", error.message);
    return { error: t("couldNotSaveUnits") };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
