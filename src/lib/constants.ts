export const APP_VERSION = "1.0.0";
export const APP_CREDIT = "Created by Alexis Roldan · 2026";

export const CATEGORIES = [
  "top",
  "bottom",
  "outerwear",
  "shoes",
  "accessory",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SUBCATEGORIES: Record<Category, string[]> = {
  top: [
    "t-shirt",
    "polo",
    "oxford shirt",
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
    "oxfords",
    "derbies",
    "boots",
    "sneakers",
    "boat shoes",
    "monk straps",
  ],
  accessory: ["watch", "belt", "man bag", "scarf", "sunglasses", "pocket square", "hat"],
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
] as const;

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
  mall: { work: 0, daily: 0.9, formality: 0, oldMoney: 0.1 },
  park: { work: 0, daily: 1, formality: 0, oldMoney: 0 },
  going_out: { work: 0, daily: 0.5, formality: 0.3, oldMoney: 0.2 },
  dinner: { work: 0, daily: 0.3, formality: 0.4, oldMoney: 0.3 },
  errands: { work: 0, daily: 1, formality: 0, oldMoney: 0 },
  home: { work: 0, daily: 1, formality: 0, oldMoney: 0 },
  travel: { work: 0.2, daily: 0.6, formality: 0.2, oldMoney: 0 },
};

/** Combination generation tuning */
export const MAX_CANDIDATES_PER_ITEM = 120;
export const SCORING_BATCH_SIZE = 12;
export const MIN_OVERALL_SCORE = 7.0;
export const MAX_FORMALITY_DELTA = 3;
export const MAX_ACCESSORIES = 2;

/** Recommendation tuning */
export const RECO_CANDIDATE_POOL = 12;
export const RECO_MIN_OCCASION_SCORE = 6.5;
export const RECO_RELAXED_SCORE = 6.0;
export const FRESHNESS_DAYS = 7;
