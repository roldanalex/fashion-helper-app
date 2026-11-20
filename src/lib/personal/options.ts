/**
 * Personal characteristics a client can share with the stylist. Pure and
 * client-safe; the single list behind the schema, onboarding and Settings.
 * Every one of these is optional: "Prefer not to say" is always allowed.
 */

export const GENDERS = ["male", "female", "other"] as const;
export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;
export const BODY_SHAPES = ["slim", "average", "athletic", "broad", "full"] as const;
export const SKIN_TONES = ["fair", "light", "medium", "olive", "tan", "deep"] as const;
export const SKIN_UNDERTONES = ["warm", "cool", "neutral"] as const;
export const HAIR_COLORS = [
  "black",
  "dark brown",
  "brown",
  "light brown",
  "blonde",
  "red",
  "gray",
  "white",
] as const;
export const EYE_COLORS = ["brown", "hazel", "green", "blue", "gray"] as const;
export const FIT_PREFERENCES = ["slim", "regular", "relaxed"] as const;

export type Gender = (typeof GENDERS)[number];
export type AgeRange = (typeof AGE_RANGES)[number];
export type BodyShape = (typeof BODY_SHAPES)[number];
export type SkinTone = (typeof SKIN_TONES)[number];
export type SkinUndertone = (typeof SKIN_UNDERTONES)[number];
export type HairColor = (typeof HAIR_COLORS)[number];
export type EyeColor = (typeof EYE_COLORS)[number];
export type FitPreference = (typeof FIT_PREFERENCES)[number];

export const STYLE_NOTES_MAX = 300;

/** Swatches shown next to skin-tone chips so the words have a reference. */
export const SKIN_TONE_SWATCH: Record<SkinTone, string> = {
  fair: "#f3d9c6",
  light: "#e6bf9f",
  medium: "#c99a72",
  olive: "#b08a5c",
  tan: "#9a6a44",
  deep: "#5e3d28",
};

/** One-line help for the undertone choice, the one people are least sure of. */
export const UNDERTONE_HELP =
  "Warm: veins look greener and gold flatters you. Cool: veins look bluer and silver flatters you. Neutral: both, or you are not sure.";

export const FIT_LABELS: Record<FitPreference, string> = {
  slim: "Slim, close to the body",
  regular: "Regular, classic cut",
  relaxed: "Relaxed, roomier",
};

/* ---------- Height and weight in the client's units ---------- */

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG);
}

export function lbToKg(lb: number): number {
  return Math.round(lb / LB_PER_KG);
}

/** "178 cm" or "5 ft 10 in". */
export function formatHeight(cm: number, units: "metric" | "imperial"): string {
  if (units === "metric") return `${cm} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet} ft ${inches} in`;
}
