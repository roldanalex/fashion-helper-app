import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signImageUrls } from "@/lib/supabase/storage";
import type { ClothingItem, Combination } from "@/types/database";

export interface EnrichedSlot {
  slot: "top" | "bottom" | "shoes" | "outerwear" | "accessory";
  item: ClothingItem;
  imageUrl?: string;
}

export interface EnrichedCombination {
  combination: Combination;
  slots: EnrichedSlot[];
}

/** Resolve combination item ids into full items with signed image URLs. */
export async function enrichCombinations(
  supabase: SupabaseClient,
  combinations: Combination[],
): Promise<EnrichedCombination[]> {
  const ids = new Set<string>();
  for (const c of combinations) {
    ids.add(c.top_id);
    ids.add(c.bottom_id);
    ids.add(c.shoes_id);
    if (c.outerwear_id) ids.add(c.outerwear_id);
    c.accessory_ids.forEach((a) => ids.add(a));
  }
  if (ids.size === 0) return [];

  const { data } = await supabase
    .from("clothing_items")
    .select("*")
    .in("id", [...ids]);
  const items = new Map((data ?? []).map((i) => [i.id, i as ClothingItem]));
  const urls = await signImageUrls(
    supabase,
    [...items.values()].map((i) => i.image_url),
  );

  return combinations.map((combination) => {
    const slots: EnrichedSlot[] = [];
    const push = (slot: EnrichedSlot["slot"], id: string | null) => {
      if (!id) return;
      const item = items.get(id);
      if (item) slots.push({ slot, item, imageUrl: urls[item.image_url] });
    };
    push("top", combination.top_id);
    push("bottom", combination.bottom_id);
    push("outerwear", combination.outerwear_id);
    push("shoes", combination.shoes_id);
    combination.accessory_ids.forEach((a) => push("accessory", a));
    return { combination, slots };
  });
}
