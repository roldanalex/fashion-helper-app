import { generateCandidatesForItem } from "@/lib/combinations/candidates";
import { CATEGORIES, SEASONS, type Category } from "@/lib/constants";
import type { ClothingItem } from "@/types/database";

export interface CategoryGap {
  category: Category;
  owned: number;
  /** Upper bound of new outfit candidates one good neutral piece would unlock. */
  unlocks: number;
  bottleneck: boolean;
}

/** A hypothetical "good neutral piece" used to probe the candidate engine. */
function makeProbe(category: Category, formality: number): ClothingItem {
  return {
    id: `probe-${category}`,
    user_id: "probe",
    name: `probe ${category}`,
    category,
    subcategory: null,
    color_name: "neutral",
    color_hex: "#3a3631",
    pattern: "solid",
    material: "cotton",
    description: null,
    season: [...SEASONS],
    formality_level: formality,
    old_money_score: 8,
    image_url: "",
    ai_status: "confirmed",
    combo_status: "none",
    last_worn: null,
    wear_count: 0,
    purchase_price: null,
    archived: false,
    created_at: "",
  };
}

function medianFormality(wardrobe: ClothingItem[], fallback: number): number {
  const levels = wardrobe
    .map((i) => i.formality_level)
    .filter((f): f is number => f != null)
    .sort((a, b) => a - b);
  if (levels.length === 0) return fallback;
  return levels[Math.floor(levels.length / 2)];
}

/**
 * For each category, how many new outfit candidates would one well-chosen
 * neutral piece unlock? Pure TypeScript — reuses the combination candidate
 * engine with a probe item, zero AI cost.
 */
export function analyzeGaps(
  wardrobe: ClothingItem[],
  preferredFormality: number | null,
): CategoryGap[] {
  const usable = wardrobe.filter((i) => !i.archived && i.ai_status === "confirmed");
  const formality = medianFormality(usable, preferredFormality ?? 5);

  const gaps = CATEGORIES.map((category) => {
    const probe = makeProbe(category, formality);
    const unlocks = generateCandidatesForItem(probe, [...usable, probe], 2000).length;
    const owned = usable.filter((i) => i.category === category).length;
    return { category, owned, unlocks, bottleneck: false };
  });

  // The bottleneck is the category with the highest unlock potential
  // among the underrepresented slots.
  const max = Math.max(...gaps.map((g) => g.unlocks));
  for (const g of gaps) g.bottleneck = g.unlocks === max && max > 0;

  return gaps.sort((a, b) => b.unlocks - a.unlocks);
}
