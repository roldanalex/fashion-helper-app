"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { geocode } from "@/lib/weather";
import { STYLE_PREFERENCES } from "@/lib/constants";

const settingsSchema = z.object({
  style_preferences: z
    .array(z.enum(STYLE_PREFERENCES.map((s) => s.value) as [string, ...string[]]))
    .min(1),
  preferred_formality: z.number().int().min(1).max(10),
  home_location: z.string().min(2),
});

export async function updateSettings(input: unknown) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

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
  if (error) return { error: "Could not save settings." };

  revalidatePath("/settings");
  return { ok: true };
}
