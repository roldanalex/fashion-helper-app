// Hand-maintained row types mirroring supabase/migrations.
// Regenerate with `supabase gen types typescript` once the CLI is linked, if preferred.

export type Category = "top" | "bottom" | "outerwear" | "shoes" | "accessory";
export type AiStatus = "pending" | "tagged" | "confirmed" | "failed";
export type ComboStatus = "none" | "queued" | "generating" | "done" | "failed";
export type SuggestionStatus = "suggested" | "saved" | "dismissed" | "purchased";

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
  color_season: string | null;
  preferred_formality: number | null;
  style_preferences: string[];
  lifestyle_tags: string[];
  home_location: string | null;
  home_lat: number | null;
  home_lon: number | null;
  units: "metric" | "imperial";
  onboarded_at: string | null;
  created_at: string;
}

export interface ClothingItem {
  id: string;
  user_id: string;
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
  top_id: string;
  bottom_id: string;
  outerwear_id: string | null;
  shoes_id: string;
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
  condition: string;
  summary: string;
  locationName: string;
}

export interface RankedRecommendation {
  combination_id: string;
  rank: number;
  explanation: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
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
