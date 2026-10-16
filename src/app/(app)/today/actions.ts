"use server";

import { createClient } from "@/lib/supabase/server";
import type { RankedRecommendation } from "@/types/database";

/** Record what was actually worn: plan link, freshness, per-item wear stats. */
export async function markWorn(planId: string, combinationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: combo } = await supabase
    .from("combinations")
    .select("*")
    .eq("id", combinationId)
    .eq("user_id", user.id)
    .single();
  if (!combo) return { error: "Combination not found" };

  const { data: plan } = await supabase
    .from("daily_plans")
    .update({ worn_combination_id: combinationId })
    .eq("id", planId)
    .eq("user_id", user.id)
    .select("recommendations")
    .single();

  // The watch and accessories actually worn are the day's picks, not the
  // table defaults.
  const picks = (plan?.recommendations ?? []) as RankedRecommendation[];
  const pick = picks.find((p) => p.combination_id === combinationId);
  const dailyAccessories = pick?.accessory_ids;

  await supabase
    .from("combinations")
    .update({ last_recommended: new Date().toISOString() })
    .eq("id", combinationId);

  const itemIds = [
    combo.top_id,
    combo.bottom_id,
    combo.shoes_id,
    combo.outerwear_id,
    pick?.watch_id ?? combo.watch_id,
    ...(dailyAccessories?.length ? dailyAccessories : combo.accessory_ids),
  ].filter(Boolean) as string[];

  const today = new Date().toISOString().slice(0, 10);
  const { data: items } = await supabase
    .from("clothing_items")
    .select("id, wear_count")
    .in("id", itemIds);
  for (const item of items ?? []) {
    await supabase
      .from("clothing_items")
      .update({ wear_count: item.wear_count + 1, last_worn: today })
      .eq("id", item.id);
  }

  return { ok: true };
}
