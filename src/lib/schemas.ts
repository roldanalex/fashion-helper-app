import { z } from "zod";
import {
  CATEGORIES,
  HARDWARE_TONES,
  MATERIALS,
  MAX_DAILY_ACCESSORIES,
  PATTERNS,
  RECO_MAX_PICKS,
  SEASONS,
  STYLE_PREFERENCES,
  WATCH_BANDS,
} from "@/lib/constants";
import {
  AGE_RANGES,
  BODY_SHAPES,
  EYE_COLORS,
  FIT_PREFERENCES,
  GENDERS,
  HAIR_COLORS,
  SKIN_TONES,
  SKIN_UNDERTONES,
  STYLE_NOTES_MAX,
} from "@/lib/personal/options";

/* ---------- Profile / onboarding ---------- */

/*
 * Validation messages in these schemas are keys in messages/<locale>/validation.json,
 * not English text. Show them with useValidationMessage() (client) or
 * validationMessage() (server), which fall back to the raw text for anything else.
 */

/** "" and null both mean "prefer not to say". */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" ? null : v), z.enum(values).nullable()).optional();

const optionalInt = (min: number, max: number, message: string) =>
  z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().int(message).min(min, message).max(max, message).nullable(),
    )
    .optional();

/**
 * Personal characteristics. All optional: they sharpen recommendations but
 * the app works without them. Edited at onboarding and in Settings.
 */
export const personalSchema = z.object({
  gender: optionalEnum(GENDERS),
  age_range: optionalEnum(AGE_RANGES),
  height_cm: optionalInt(100, 250, "heightRange"),
  weight_kg: optionalInt(30, 250, "weightRange"),
  body_shape: optionalEnum(BODY_SHAPES),
  skin_tone: optionalEnum(SKIN_TONES),
  skin_undertone: optionalEnum(SKIN_UNDERTONES),
  hair_color: optionalEnum(HAIR_COLORS),
  eye_color: optionalEnum(EYE_COLORS),
  fit_preference: optionalEnum(FIT_PREFERENCES),
  style_notes: z
    .string()
    .trim()
    .max(STYLE_NOTES_MAX, "notesTooLong")
    .nullable()
    .optional(),
});

export type PersonalInput = z.infer<typeof personalSchema>;

export const profileSchema = personalSchema.extend({
  preferred_formality: z.number().int().min(1).max(10),
  style_preferences: z
    .array(z.enum(STYLE_PREFERENCES.map((s) => s.value) as [string, ...string[]]))
    .min(1, "styleRequired"),
  lifestyle_tags: z.array(z.string()),
  home_location: z.string().trim().min(2, "homeRequired"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/* ---------- AI: vision tagging output ---------- */

/**
 * Type-specific details. Every field is nullable (not optional) so the
 * object stays compatible with OpenAI strict structured outputs.
 */
export const accessoryAttributesSchema = z.object({
  band: z
    .enum(WATCH_BANDS)
    .nullable()
    .describe("Watches only: bracelet (metal), leather, rubber, fabric (NATO)"),
  hardware_tone: z
    .enum(HARDWARE_TONES)
    .nullable()
    .describe(
      "Metal tone of case, buckle or frame: silver (steel), gold, rose gold, two-tone",
    ),
});

export type AccessoryAttributes = z.infer<typeof accessoryAttributesSchema>;

export const EMPTY_ATTRIBUTES: AccessoryAttributes = {
  band: null,
  hardware_tone: null,
};

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
  attributes: accessoryAttributesSchema.describe(
    "Type-specific details; all null for anything that is not a watch, belt, sunglasses or bag",
  ),
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
        watch_id: z
          .string()
          .nullable()
          .describe("Watch id from the watch pool to wear today, or null for no watch"),
        accessory_ids: z
          .array(z.string())
          .max(MAX_DAILY_ACCESSORIES)
          .describe(
            "Accessory ids to wear with this outfit today, chosen from the accessory pool (at most one per type)",
          ),
        explanation: z
          .string()
          .describe(
            "Two warm, concrete sentences on why this outfit fits the day: weather, plans, style",
          ),
      }),
    )
    .min(1)
    .max(RECO_MAX_PICKS),
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
