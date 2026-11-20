"use server";

import { validationMessage } from "@/i18n/validation-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { profileSchema, type ProfileInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { geocode } from "@/lib/weather";
import { defaultUnitsForCountry, type MeasureUnits, type Units } from "@/lib/units";
import { deriveColorSeason } from "@/lib/personal/color-season";

export async function saveProfile(input: ProfileInput, measures?: MeasureUnits) {
  const t = await getTranslations("onboarding");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: await validationMessage(parsed.error.issues[0]?.message, t("errors.invalidProfile")) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("errors.notSignedIn") };

  let home_lat: number | null = null;
  let home_lon: number | null = null;
  let home_location = parsed.data.home_location;
  let units: Units | undefined;
  try {
    const geo = await geocode(home_location);
    if (geo) {
      home_lat = geo.lat;
      home_lon = geo.lon;
      units = defaultUnitsForCountry(geo.country);
      home_location = [geo.name, geo.state, geo.country]
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    // Weather key missing or API down — save the raw text, geocode later.
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      style_notes: parsed.data.style_notes || null,
      color_season: deriveColorSeason(parsed.data),
      home_location,
      home_lat,
      home_lon,
      ...(units ? { units } : {}),
      // The units the person typed their measurements in (0013 columns).
      ...(measures && (measures.weight === "kg" || measures.weight === "lb") && (measures.height === "cm" || measures.height === "ftin")
        ? { weight_unit: measures.weight, height_unit: measures.height }
        : {}),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: t("errors.couldNotSave") };

  redirect("/today");
}
