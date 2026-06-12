import { z } from "zod";
import {
  CATEGORIES,
  MATERIALS,
  PATTERNS,
  SEASONS,
  STYLE_PREFERENCES,
} from "@/lib/constants";

/* ---------- Profile / onboarding ---------- */

export const profileSchema = z.object({
  gender: z.enum(["male", "female", "other"]),
  age_range: z.enum(["18-24", "25-34", "35-44", "45-54", "55+"]),
  height_cm: z.coerce.number().int().min(100).max(250),
  weight_kg: z.coerce.number().int().min(30).max(250),
  body_shape: z.enum(["slim", "average", "athletic", "broad", "full"]),
  skin_tone: z.enum(["fair", "light", "medium", "olive", "tan", "deep"]),
  skin_undertone: z.enum(["warm", "cool", "neutral"]),
  hair_color: z.enum([
    "black",
    "dark brown",
    "brown",
    "light brown",
    "blonde",
    "red",
    "gray",
    "white",
  ]),
  eye_color: z.enum(["brown", "hazel", "green", "blue", "gray"]),
  preferred_formality: z.number().int().min(1).max(10),
  style_preferences: z
    .array(z.enum(STYLE_PREFERENCES.map((s) => s.value) as [string, ...string[]]))
    .min(1, "Pick at least one style"),
  lifestyle_tags: z.array(z.string()),
  home_location: z.string().min(2, "Where do you live?"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/* ---------- AI: vision tagging output ---------- */

export const itemTagsSchema = z.object({
  name: z.string().describe("Short human name, e.g. 'Navy pique polo'"),
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe("e.g. polo, chinos, loafers, watch"),
  color_name: z.string().describe("Primary color, e.g. 'navy'"),
  color_hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .describe("Hex of the primary color, e.g. #1f2a44"),
  pattern: z.enum(PATTERNS),
  material: z.enum(MATERIALS),
  season: z.array(z.enum(SEASONS)).min(1),
  formality_level: z.number().int().min(1).max(10),
  old_money_score: z.number().int().min(1).max(10),
});

export type ItemTags = z.infer<typeof itemTagsSchema>;

/* ---------- AI: combination scoring output ---------- */

export const combinationScoreSchema = z.object({
  index: z.number().int().describe("Index of the candidate in the input list"),
  color_harmony_score: z.number().min(0).max(10),
  old_money_score: z.number().min(0).max(10),
  formality_score: z.number().min(0).max(10),
  weather_suitability_score: z.number().min(0).max(10),
  work_score: z.number().min(0).max(10),
  daily_score: z.number().min(0).max(10),
  overall_score: z.number().min(0).max(10),
  season_suitability: z.array(z.enum(SEASONS)),
  notes: z.string().describe("One stylist's sentence about this combination"),
});

export const combinationBatchSchema = z.object({
  scores: z.array(combinationScoreSchema),
});

export type CombinationScore = z.infer<typeof combinationScoreSchema>;

/* ---------- AI: daily re-ranking output ---------- */

export const rerankSchema = z.object({
  picks: z
    .array(
      z.object({
        combination_id: z.string(),
        rank: z.number().int().min(1),
        explanation: z
          .string()
          .describe(
            "Two warm, concrete sentences on why this outfit fits the day: weather, plans, style",
          ),
      }),
    )
    .min(1)
    .max(5),
});

export type RerankResult = z.infer<typeof rerankSchema>;

/* ---------- AI: shopping suggestions output ---------- */

export const shoppingSchema = z.object({
  suggestions: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      subcategory: z.string(),
      item_name: z.string().describe("Specific piece, e.g. 'Navy hopsack blazer'"),
      color_name: z.string(),
      description: z.string().describe("What it looks like, one sentence"),
      reason: z
        .string()
        .describe("Why it suits this wardrobe and style, one sentence"),
    }),
  ),
});

export type ShoppingResult = z.infer<typeof shoppingSchema>;
