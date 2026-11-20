/**
 * Seasonal colour analysis from self-reported colouring. Deterministic, no AI.
 *
 * Temperature (warm or cool) comes from the undertone, or from hair and eyes
 * when the undertone is neutral or unknown. Depth (light, medium or deep) and
 * contrast come from skin and hair. The classic four-season mapping follows:
 *   warm + light or bright -> spring    warm + deep or muted -> autumn
 *   cool + light or soft   -> summer    cool + deep or high contrast -> winter
 */
import type {
  EyeColor,
  HairColor,
  SkinTone,
  SkinUndertone,
} from "@/lib/personal/options";

export const COLOR_SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type ColorSeason = (typeof COLOR_SEASONS)[number];

export interface ColoringInput {
  skin_tone?: SkinTone | string | null;
  skin_undertone?: SkinUndertone | string | null;
  hair_color?: HairColor | string | null;
  eye_color?: EyeColor | string | null;
}

export interface SeasonPalette {
  season: ColorSeason;
  label: string;
  /** Plain-language summary for prompts and the Settings preview. */
  summary: string;
  /** Colours that flatter near the face (shirts, knitwear, jackets). */
  flatter: { name: string; hex: string }[];
  /** Colours to keep away from the face (fine on trousers and shoes). */
  avoid: { name: string; hex: string }[];
}

export const SEASON_PALETTES: Record<ColorSeason, SeasonPalette> = {
  spring: {
    season: "spring",
    label: "Spring",
    summary:
      "warm, clear and light: ivory, camel, warm navy, coral, warm greens and golden browns",
    flatter: [
      { name: "ivory", hex: "#f4ecd8" },
      { name: "camel", hex: "#c19a6b" },
      { name: "warm navy", hex: "#2c3e63" },
      { name: "coral", hex: "#f08068" },
      { name: "light warm grey", hex: "#c8bfb0" },
      { name: "golden brown", hex: "#9a6b3a" },
      { name: "warm green", hex: "#6f9a4c" },
      { name: "turquoise", hex: "#3fb5a8" },
    ],
    avoid: [
      { name: "black", hex: "#111111" },
      { name: "charcoal", hex: "#36393d" },
      { name: "icy blue", hex: "#cfe3f2" },
      { name: "burgundy", hex: "#5c1a2b" },
    ],
  },
  summer: {
    season: "summer",
    label: "Summer",
    summary:
      "cool, soft and light: soft white, dove grey, powder and slate blue, rose, lavender and soft navy",
    flatter: [
      { name: "soft white", hex: "#f2f1ec" },
      { name: "dove grey", hex: "#a9acb0" },
      { name: "powder blue", hex: "#a7c4dc" },
      { name: "slate blue", hex: "#5d7391" },
      { name: "soft navy", hex: "#34435e" },
      { name: "dusty rose", hex: "#c99aa3" },
      { name: "lavender", hex: "#a99cc4" },
      { name: "sage", hex: "#9fae98" },
    ],
    avoid: [
      { name: "orange", hex: "#e2711d" },
      { name: "mustard", hex: "#c99a1e" },
      { name: "black", hex: "#111111" },
      { name: "rust", hex: "#a2471f" },
    ],
  },
  autumn: {
    season: "autumn",
    label: "Autumn",
    summary:
      "warm, rich and muted: cream, camel, olive, rust, chocolate, forest green and warm navy",
    flatter: [
      { name: "cream", hex: "#efe3c8" },
      { name: "camel", hex: "#b88a55" },
      { name: "olive", hex: "#6b6b3a" },
      { name: "rust", hex: "#a24d22" },
      { name: "chocolate", hex: "#4e3424" },
      { name: "forest green", hex: "#2f4f3a" },
      { name: "warm navy", hex: "#2c3a55" },
      { name: "mustard", hex: "#c39a2e" },
    ],
    avoid: [
      { name: "optic white", hex: "#ffffff" },
      { name: "icy blue", hex: "#cfe3f2" },
      { name: "fuchsia", hex: "#d1338a" },
      { name: "silver grey", hex: "#c0c4c8" },
    ],
  },
  winter: {
    season: "winter",
    label: "Winter",
    summary:
      "cool, clear and high-contrast: crisp white, black, charcoal, true navy, burgundy, emerald and icy tones",
    flatter: [
      { name: "crisp white", hex: "#fbfbfb" },
      { name: "black", hex: "#141414" },
      { name: "charcoal", hex: "#33363b" },
      { name: "true navy", hex: "#1b2747" },
      { name: "burgundy", hex: "#6a1a2e" },
      { name: "emerald", hex: "#16704f" },
      { name: "royal blue", hex: "#2851a3" },
      { name: "icy blue", hex: "#d6e6f3" },
    ],
    avoid: [
      { name: "camel", hex: "#c19a6b" },
      { name: "mustard", hex: "#c99a1e" },
      { name: "orange", hex: "#e2711d" },
      { name: "olive", hex: "#6b6b3a" },
    ],
  },
};

type Temperature = "warm" | "cool";
type Depth = "light" | "medium" | "deep";

const LIGHT_HAIR = new Set(["blonde", "light brown", "red", "gray", "white"]);
const DARK_HAIR = new Set(["black", "dark brown"]);

function temperature(c: ColoringInput): Temperature | null {
  if (c.skin_undertone === "warm") return "warm";
  if (c.skin_undertone === "cool") return "cool";
  // Neutral or unknown: hair, then eyes, tip the balance.
  if (c.hair_color === "red" || c.hair_color === "blonde") return "warm";
  if (c.hair_color === "gray" || c.hair_color === "white") return "cool";
  if (c.eye_color === "hazel" || c.eye_color === "green") return "warm";
  if (c.eye_color === "blue" || c.eye_color === "gray") return "cool";
  if (c.skin_tone === "olive") return "warm";
  if (c.hair_color === "black") return "cool";
  // Neutral undertone with brown hair and brown eyes: lean warm, the commoner case.
  if (c.skin_undertone === "neutral") return "warm";
  return null;
}

function depth(c: ColoringInput): Depth | null {
  const skin = c.skin_tone;
  const hair = c.hair_color;
  if (!skin && !hair) return null;
  const lightSkin = skin === "fair" || skin === "light";
  const deepSkin = skin === "tan" || skin === "deep";
  if (deepSkin) return "deep";
  if (lightSkin && hair && LIGHT_HAIR.has(hair)) return "light";
  if (hair && DARK_HAIR.has(hair) && !lightSkin) return "deep";
  if (lightSkin && !hair) return "light";
  return "medium";
}

/** Light skin with black or dark-brown hair: the classic high-contrast look. */
function highContrast(c: ColoringInput): boolean {
  const lightSkin = c.skin_tone === "fair" || c.skin_tone === "light";
  return lightSkin && !!c.hair_color && DARK_HAIR.has(c.hair_color);
}

/**
 * The client's colour season, or null when there is not enough to go on
 * (no undertone, hair or eyes to read temperature from).
 */
export function deriveColorSeason(c: ColoringInput): ColorSeason | null {
  const temp = temperature(c);
  if (!temp) return null;
  const d = depth(c) ?? "medium";
  const brightEyes = c.eye_color === "blue" || c.eye_color === "green";

  if (temp === "warm") {
    if (d === "light") return "spring";
    if (d === "deep") return "autumn";
    return brightEyes ? "spring" : "autumn";
  }
  if (d === "deep" || highContrast(c)) return "winter";
  if (d === "light") return "summer";
  return c.hair_color && DARK_HAIR.has(c.hair_color) ? "winter" : "summer";
}

export function isColorSeason(v: unknown): v is ColorSeason {
  return typeof v === "string" && (COLOR_SEASONS as readonly string[]).includes(v);
}

export function paletteFor(season: string | null | undefined): SeasonPalette | null {
  return isColorSeason(season) ? SEASON_PALETTES[season] : null;
}
