"use server";

import { redirect } from "next/navigation";
import { profileSchema, type ProfileInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { geocode } from "@/lib/weather";

export async function saveProfile(input: ProfileInput) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile" };
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
    // Weather key missing or API down — save the raw text, geocode later.
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      home_location,
      home_lat,
      home_lon,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: "Could not save your profile. Please try again." };

  redirect("/today");
}
