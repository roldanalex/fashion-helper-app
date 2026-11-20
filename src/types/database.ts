// Hand-maintained row types mirroring supabase/migrations.
// Regenerate with `supabase gen types typescript` once the CLI is linked, if preferred.

export type Category =
  | "top"
  | "bottom"
  | "outerwear"
  | "shoes"
  | "watch"
  | "accessory";
export type AiStatus = "pending" | "tagged" | "confirmed" | "failed";
export type ComboStatus = "none" | "queued" | "generating" | "done" | "failed";
export type SuggestionStatus = "suggested" | "saved" | "dismissed" | "purchased";

/** Type-specific accessory details (see ACCESSORY_DETAILS in constants). */
export interface ItemAttributes {
  band?: string | null;
  hardware_tone?: string | null;
}

export interface AccessGrant {
  email: string;
  role: "member" | "admin";
  granted_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  gender: string | null;
  age_range: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_shape: string | null;
  skin_tone: string | null;
  skin_undertone: string | null;
  hair_color: string | null;
  eye_color: string | null;
  /** Derived from colouring by deriveColorSeason(); spring | summer | autumn | winter. */
  color_season: string | null;
  /** slim | regular | relaxed (0010). */
  fit_preference: string | null;
  /** Free-text notes for the stylist, max 300 characters (0010). */
  style_notes: string | null;
  preferred_formality: number | null;
  style_preferences: string[];
  lifestyle_tags: string[];
  home_location: string | null;
  home_lat: number | null;
  home_lon: number | null;
  /** Temperature unit: metric = °C, imperial = °F. */
  units: "metric" | "imperial";
  /** kg | lb (0013); null on rows that predate it. */
  weight_unit: "kg" | "lb" | null;
  /** cm | ftin (0013). */
  height_unit: "cm" | "ftin" | null;
  /** App and AI language (0013). */
  locale: string;
  onboarded_at: string | null;
  created_at: string;
}

export interface ClothingItem {
  id: string;
  user_id: string;
  /** The Person this row belongs to (0011). user_id is the Account that created it. */
  person_id: string;
  name: string;
  category: Category;
  subcategory: string | null;
  color_name: string | null;
  color_hex: string | null;
  pattern: string | null;
  material: string | null;
  description: string | null;
  season: string[];
  formality_level: number | null;
  old_money_score: number | null;
  attributes: ItemAttributes;
  image_url: string;
  ai_status: AiStatus;
  combo_status: ComboStatus;
  last_worn: string | null;
  wear_count: number;
  purchase_price: number | null;
  archived: boolean;
  created_at: string;
}

export interface Combination {
  id: string;
  user_id: string;
  /** The Person this row belongs to (0011). user_id is the Account that created it. */
  person_id: string;
  top_id: string;
  bottom_id: string;
  outerwear_id: string | null;
  shoes_id: string;
  watch_id: string | null;
  accessory_ids: string[];
  color_harmony_score: number | null;
  old_money_score: number | null;
  formality_score: number | null;
  weather_suitability_score: number | null;
  work_score: number | null;
  daily_score: number | null;
  overall_score: number;
  season_suitability: string[];
  notes: string | null;
  boosted: boolean;
  hidden: boolean;
  created_at: string;
  last_recommended: string | null;
}

export interface WeatherSnapshot {
  tempC: number;
  feelsLikeC: number;
  tempMinC: number;
  tempMaxC: number;
  precipProb: number;
  humidity: number;
  /** OpenWeatherMap's main group ("Rain"): always English, used for logic. */
  condition: string;
  /** The description in the user's language ("lluvia ligera"), for display. */
  label?: string;
  summary: string;
  locationName: string;
}

export interface RankedRecommendation {
  combination_id: string;
  rank: number;
  explanation: string;
  /** Watch chosen for the day; falls back to the combination's own when absent. */
  watch_id?: string | null;
  /** Accessories chosen for the day; falls back to the combination's own when absent. */
  accessory_ids?: string[];
}

export interface DailyPlan {
  id: string;
  user_id: string;
  /** The Person this row belongs to (0011). user_id is the Account that created it. */
  person_id: string;
  plan_date: string;
  occasion: string;
  destination: string | null;
  dest_lat: number | null;
  dest_lon: number | null;
  notes: string | null;
  weather: WeatherSnapshot | null;
  recommendations: RankedRecommendation[] | null;
  worn_combination_id: string | null;
  created_at: string;
}

export interface ShoppingSuggestion {
  id: string;
  user_id: string;
  /** The Person this row belongs to (0011). user_id is the Account that created it. */
  person_id: string;
  category: Category;
  subcategory: string | null;
  item_name: string;
  description: string | null;
  reason: string | null;
  color_name: string | null;
  estimated_new_combinations: number | null;
  status: SuggestionStatus;
  created_at: string;
}

/* ---------- People and Families (0011) ---------- */

export type AgeBand = "adult" | "teen" | "child" | "toddler";
export type PersonKind = "self" | "managed";
export type FamilyRole = "owner" | "manager" | "viewer";

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
}

/** Someone whose clothes are catalogued (see GLOSSARY.md). */
export interface Person {
  id: string;
  family_id: string;
  kind: PersonKind;
  /** Set for a self Person; null for a Managed person. */
  account_user_id: string | null;
  display_name: string;
  age_band: AgeBand;
  is_minor: boolean;
  /** Managed people only: a self Person's style and traits live on profiles. */
  style_preferences: string[];
  preferred_formality: number | null;
  gender: string | null;
  skin_tone: string | null;
  skin_undertone: string | null;
  hair_color: string | null;
  eye_color: string | null;
  color_season: string | null;
  height_cm: number | null;
  body_shape: string | null;
  fit_preference: string | null;
  style_notes: string | null;
  guardian_attested_at: string | null;
  created_by: string | null;
  created_at: string;
}
