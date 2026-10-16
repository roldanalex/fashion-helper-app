import type { ClothingItem, Combination } from "@/types/database";

let counter = 0;

/** A confirmed, all-season, neutral piece; override what the test cares about. */
export function makeItem(overrides: Partial<ClothingItem> = {}): ClothingItem {
  counter += 1;
  return {
    id: overrides.id ?? `item-${counter}`,
    user_id: "user-1",
    name: overrides.name ?? `Item ${counter}`,
    category: "top",
    subcategory: null,
    color_name: "navy",
    color_hex: "#1f2a44",
    pattern: "solid",
    material: "cotton",
    description: null,
    season: ["spring", "summer", "fall", "winter"],
    formality_level: 6,
    old_money_score: 7,
    attributes: {},
    image_url: "",
    ai_status: "confirmed",
    combo_status: "done",
    last_worn: null,
    wear_count: 0,
    purchase_price: null,
    archived: false,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCombination(
  overrides: Partial<Combination> = {},
): Combination {
  counter += 1;
  return {
    id: overrides.id ?? `combo-${counter}`,
    user_id: "user-1",
    top_id: "top-1",
    bottom_id: "bottom-1",
    outerwear_id: null,
    shoes_id: "shoes-1",
    watch_id: null,
    accessory_ids: [],
    color_harmony_score: 8,
    old_money_score: 8,
    formality_score: 7,
    weather_suitability_score: 7,
    work_score: 8,
    daily_score: 7,
    overall_score: 8,
    season_suitability: ["spring", "fall"],
    notes: null,
    boosted: false,
    hidden: false,
    created_at: "2026-01-01T00:00:00Z",
    last_recommended: null,
    ...overrides,
  };
}

/** Top, bottom and shoes that pair with anything. */
export function baseWardrobe(): ClothingItem[] {
  return [
    makeItem({ id: "top-1", category: "top", subcategory: "polo", name: "Navy polo" }),
    makeItem({
      id: "bottom-1",
      category: "bottom",
      subcategory: "chinos",
      name: "Tan chinos",
      color_name: "tan",
      color_hex: "#c2a878",
    }),
    makeItem({
      id: "shoes-1",
      category: "shoes",
      subcategory: "loafers",
      name: "Brown loafers",
      color_name: "brown",
      color_hex: "#5b3a21",
      material: "leather",
    }),
  ];
}
