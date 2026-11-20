import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signImageUrls } from "@/lib/supabase/storage";
import { outfitPieceIds, type Wardrobe } from "@/lib/wardrobe";
import type { ClothingItem, Combination } from "@/types/database";

export interface EnrichedSlot {
  slot: "top" | "bottom" | "shoes" | "outerwear" | "watch" | "accessory";
  item: ClothingItem;
  imageUrl?: string;
}

export interface EnrichedCombination {
  combination: Combination;
  slots: EnrichedSlot[];
}

/**
 * Resolve Outfit piece ids into full pieces with signed image URLs. Pieces
 * are read through the Person's Wardrobe, so another Person's piece can
 * never appear in an Outfit card.
 */
export async function enrichCombinations(
  supabase: SupabaseClient,
  wardrobe: Wardrobe,
  combinations: Combination[],
): Promise<EnrichedCombination[]> {
  const ids = new Set(combinations.flatMap((c) => outfitPieceIds(c)));
  if (ids.size === 0) return [];

  const pieces = await wardrobe.pieces({ ids: [...ids] });
  const items = new Map(pieces.map((i) => [i.id, i as ClothingItem]));
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
    push("watch", combination.watch_id);
    combination.accessory_ids.forEach((a) => push("accessory", a));
    return { combination, slots };
  });
}
