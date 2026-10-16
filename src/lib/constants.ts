export const APP_VERSION = "1.2.0";
export const APP_CREDIT = "Created by Alexis Roldan · 2026";

export const CATEGORIES = [
  "top",
  "bottom",
  "outerwear",
  "shoes",
  "watch",
  "accessory",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Section headings for the wardrobe grouped view. */
export const CATEGORY_PLURAL_LABELS: Record<Category, string> = {
  top: "Tops",
  bottom: "Bottoms",
  outerwear: "Outerwear",
  shoes: "Shoes",
  watch: "Watches",
  accessory: "Accessories",
};

export const SUBCATEGORIES: Record<Category, string[]> = {
  top: [
    "t-shirt",
    "v-neck",
    "polo",
    "oxford shirt",
    "button-down shirt",
    "dress shirt",
    "henley",
    "sweater",
    "knit polo",
    "turtleneck",
    "blouse",
  ],
  bottom: [
    "chinos",
    "dress trousers",
    "jeans",
    "shorts",
    "pleated trousers",
    "skirt",
  ],
  outerwear: [
    "blazer",
    "sport coat",
    "overcoat",
    "trench coat",
    "cardigan",
    "quarter-zip",
    "harrington jacket",
    "field jacket",
  ],
  shoes: [
    "loafers",
    "drivers",
    "oxfords",
    "derbies",
    "boots",
    "sneakers",
    "boat shoes",
    "monk straps",
  ],
  // Watch types are the watch style: a dress watch and a diver dress differently.
  watch: ["dress", "sports", "diver", "gmt", "chronograph", "field", "pilot"],
  accessory: ["belt", "man bag", "scarf", "sunglasses", "pocket square", "hat"],
};

export const MATERIALS = [
  "cotton",
  "pique",
  "knit",
  "wool",
  "merino",
  "cashmere",
  "linen",
  "denim",
  "leather",
  "suede",
  "silk",
  "tweed",
  "corduroy",
  "canvas",
  "synthetic",
  "steel",
  "gold",
  "titanium",
  "rubber",
  "nylon",
  "acetate",
] as const;

/* ---------- Accessory details (type-specific, stored in `attributes`) ---------- */

export const WATCH_STYLES = [
  "dress",
  "sports",
  "diver",
  "gmt",
  "chronograph",
  "field",
  "pilot",
] as const;
export type WatchStyle = (typeof WATCH_STYLES)[number];

export const WATCH_BANDS = ["bracelet", "leather", "rubber", "fabric"] as const;
export type WatchBand = (typeof WATCH_BANDS)[number];

export const HARDWARE_TONES = ["silver", "gold", "rose gold", "two-tone"] as const;
export type HardwareTone = (typeof HARDWARE_TONES)[number];

export type AccessoryAttributeKey = "band" | "hardware_tone";

export interface AccessoryDetailField {
  key: AccessoryAttributeKey;
  label: string;
  options: readonly string[];
}

/** Human labels for chip values that read poorly when auto-capitalized. */
export const ATTRIBUTE_VALUE_LABELS: Record<string, string> = {
  gmt: "GMT / travel",
  dress: "Dress",
  sports: "Sports",
  bracelet: "Metal bracelet",
  leather: "Leather strap",
  rubber: "Rubber strap",
  fabric: "Fabric / NATO",
};

/** Extra chip rows every watch gets; its style is the Type row. */
export const WATCH_DETAILS: AccessoryDetailField[] = [
  { key: "band", label: "Band", options: WATCH_BANDS },
  { key: "hardware_tone", label: "Hardware tone", options: HARDWARE_TONES },
];

/**
 * Extra chip rows per accessory type. Metal-bearing accessories get a
 * hardware tone so buckles and frames can be matched to the watch.
 */
export const ACCESSORY_DETAILS: Record<string, AccessoryDetailField[]> = {
  belt: [{ key: "hardware_tone", label: "Buckle tone", options: HARDWARE_TONES }],
  sunglasses: [{ key: "hardware_tone", label: "Frame tone", options: HARDWARE_TONES }],
  "man bag": [{ key: "hardware_tone", label: "Hardware tone", options: HARDWARE_TONES }],
};

/** Detail chip rows the tag editor shows for a category + type. */
export function detailFieldsFor(
  category: string,
  subcategory: string | null | undefined,
): AccessoryDetailField[] {
  if (category === "watch") return WATCH_DETAILS;
  if (category === "accessory") return ACCESSORY_DETAILS[subcategory ?? ""] ?? [];
  return [];
}

export const PATTERNS = [
  "solid",
  "striped",
  "plaid",
  "check",
  "herringbone",
  "houndstooth",
  "floral",
  "printed",
] as const;

export const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const STYLE_PREFERENCES = [
  { value: "old_money", label: "Old Money" },
  { value: "classic", label: "Classic" },
  { value: "smart_casual", label: "Smart Casual" },
  { value: "minimalist", label: "Minimalist" },
  { value: "sporty", label: "Sporty" },
  { value: "streetwear", label: "Streetwear" },
] as const;

export const OCCASIONS = [
  { value: "work", label: "Work", icon: "briefcase" },
  { value: "indoors", label: "Indoors / Conferences", icon: "presentation" },
  { value: "lunch", label: "Lunch", icon: "sandwich" },
  { value: "mall", label: "Mall / Shopping", icon: "shopping-bag" },
  { value: "park", label: "Park / Outdoors", icon: "trees" },
  { value: "going_out", label: "Going Out", icon: "martini" },
  { value: "dinner", label: "Dinner", icon: "utensils" },
  { value: "errands", label: "Errands", icon: "list-checks" },
  { value: "home", label: "At Home", icon: "house" },
  { value: "travel", label: "Travel", icon: "plane" },
] as const;
export type Occasion = (typeof OCCASIONS)[number]["value"];

/**
 * How each occasion maps onto the combination score columns.
 * The mapped score is a weighted blend; weights must sum to 1.
 */
export const OCCASION_WEIGHTS: Record<
  Occasion,
  { work: number; daily: number; formality: number; oldMoney: number }
> = {
  work: { work: 0.8, daily: 0, formality: 0.2, oldMoney: 0 },
  indoors: { work: 0.6, daily: 0.1, formality: 0.3, oldMoney: 0 },
  lunch: { work: 0.2, daily: 0.5, formality: 0.1, oldMoney: 0.2 },
  mall: { work: 0, daily: 0.9, formality: 0, oldMoney: 0.1 },
  park: { work: 0, daily: 1, formality: 0, oldMoney: 0 },
  going_out: { work: 0, daily: 0.5, formality: 0.3, oldMoney: 0.2 },
  dinner: { work: 0, daily: 0.3, formality: 0.4, oldMoney: 0.3 },
  errands: { work: 0, daily: 1, formality: 0, oldMoney: 0 },
  home: { work: 0, daily: 1, formality: 0, oldMoney: 0 },
  travel: { work: 0.2, daily: 0.6, formality: 0.2, oldMoney: 0 },
};

/** One-line stylist hints per occasion, fed to the daily ranking prompt. */
export const OCCASION_HINTS: Record<Occasion, string> = {
  work: "An office or client-facing day; polished, business-casual or above.",
  indoors:
    "A climate-controlled day (conference, office, venue). The weather only matters for the commute, so favour layers that come off indoors and comfort for long hours of sitting and standing.",
  lunch:
    "A daytime lunch, relaxed but put-together; easy pieces that still look intentional across the table.",
  mall: "Shopping and walking; comfortable shoes, easy layers.",
  park: "Outdoors and on the move; dress for the weather first.",
  going_out: "An evening out; a touch more presence and polish.",
  dinner: "A sit-down dinner; elevated, considered, never stiff.",
  errands: "Quick stops around town; practical and unfussy.",
  home: "A day at home; comfort with a little intention.",
  travel:
    "A travel day; comfortable for transit, presentable on arrival. A GMT or travel watch and easy-to-remove layers are natural choices.",
};

/** Combination generation tuning */
export const MAX_CANDIDATES_PER_ITEM = 120;
export const SCORING_BATCH_SIZE = 12;
export const MIN_OVERALL_SCORE = 7.0;
export const MAX_FORMALITY_DELTA = 3;
export const MAX_ACCESSORIES = 2;

/** Recommendation tuning */
export const RECO_CANDIDATE_POOL = 16;
export const RECO_MIN_PICKS = 5;
export const RECO_MAX_PICKS = 7;
/** Accessories the daily stylist may attach to one outfit (watch, belt, …). */
export const MAX_DAILY_ACCESSORIES = 3;
export const RECO_MIN_OCCASION_SCORE = 6.5;
export const RECO_RELAXED_SCORE = 6.0;
export const FRESHNESS_DAYS = 7;
