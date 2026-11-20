/**
 * Turns the client's personal characteristics into a compact prompt block.
 * Pure. Unknown fields are left out, and weight is never sent: body shape
 * says what the stylist needs about proportions.
 */
import { formatHeight, type FitPreference } from "@/lib/personal/options";
import { deriveColorSeason, paletteFor } from "@/lib/personal/color-season";
import type { Profile } from "@/types/database";

export type PersonalProfile = Partial<
  Pick<
    Profile,
    | "gender"
    | "age_range"
    | "height_cm"
    | "body_shape"
    | "skin_tone"
    | "skin_undertone"
    | "hair_color"
    | "eye_color"
    | "color_season"
    | "fit_preference"
    | "style_notes"
    | "lifestyle_tags"
    | "units"
    | "height_unit"
  >
>;

/** Proportion advice per body shape, phrased as what flatters. */
const BODY_SHAPE_ADVICE: Record<string, string> = {
  slim: "layers, textured fabrics and structured jackets add presence; avoid very oversized cuts",
  average: "most classic cuts work; keep fits clean and tailored",
  athletic:
    "tailoring with some stretch, tapered trousers and open collars suit a defined chest and shoulders",
  broad:
    "darker or plainer tops, soft-shouldered jackets and straight trousers balance broad shoulders",
  full: "clean vertical lines, tonal outfits, mid-weight fabrics that skim rather than cling, and open-collar layers",
};

const FIT_ADVICE: Record<FitPreference, string> = {
  slim: "prefers a slim, close fit",
  regular: "prefers a regular, classic fit",
  relaxed: "prefers a relaxed, roomier fit",
};

function heightAdvice(cm: number): string | null {
  if (cm < 168) return "tonal and monochrome outfits lengthen the line; avoid heavy cuffs and long jackets";
  if (cm > 188) return "can carry longer coats, cuffs and contrast between top and trousers";
  return null;
}

/** The season stored on the profile, or derived on the fly from colouring. */
export function seasonOf(p: PersonalProfile): string | null {
  return p.color_season ?? deriveColorSeason(p);
}

/**
 * Prompt lines describing the client, or an empty string when they have
 * shared nothing. Never mentions weight; describes what flatters.
 */
export function describeClient(p: PersonalProfile | null | undefined): string {
  if (!p) return "";
  const lines: string[] = [];

  const who = [p.gender && p.gender !== "other" ? p.gender : null, p.age_range ? `aged ${p.age_range}` : null]
    .filter(Boolean)
    .join(", ");
  if (who) lines.push(`Client: ${who}.`);

  const build: string[] = [];
  if (p.height_cm) build.push(formatHeight(p.height_cm, p.height_unit ?? p.units ?? "metric"));
  if (p.body_shape) build.push(`${p.body_shape} build`);
  if (build.length) {
    const advice = [
      p.body_shape ? BODY_SHAPE_ADVICE[p.body_shape] : null,
      p.height_cm ? heightAdvice(p.height_cm) : null,
    ].filter(Boolean);
    lines.push(`Build: ${build.join(", ")}.${advice.length ? ` What flatters: ${advice.join("; ")}.` : ""}`);
  }

  const coloring = [
    p.skin_tone ? `${p.skin_tone} skin` : null,
    p.skin_undertone ? `${p.skin_undertone} undertone` : null,
    p.hair_color ? `${p.hair_color} hair` : null,
    p.eye_color ? `${p.eye_color} eyes` : null,
  ].filter(Boolean);
  if (coloring.length) lines.push(`Colouring: ${coloring.join(", ")}.`);

  const palette = paletteFor(seasonOf(p));
  if (palette) {
    lines.push(
      `Colour season: ${palette.label} (${palette.summary}). Near the face favour ${palette.flatter
        .slice(0, 6)
        .map((c) => c.name)
        .join(", ")}; keep ${palette.avoid.map((c) => c.name).join(", ")} away from the face (fine on trousers and shoes).`,
    );
  }

  if (p.fit_preference && p.fit_preference in FIT_ADVICE) {
    lines.push(`Fit: ${FIT_ADVICE[p.fit_preference as FitPreference]}.`);
  }
  if (p.lifestyle_tags?.length) lines.push(`Lifestyle: ${p.lifestyle_tags.join(", ")}.`);
  if (p.style_notes?.trim()) {
    // Quoted and flattened so the note reads as the client's words, not instructions.
    const note = p.style_notes.trim().replace(/\s+/g, " ").replace(/"/g, "'").slice(0, 300);
    lines.push(`In their own words: "${note}"`);
  }

  return lines.join("\n");
}

/** The tone rule every prompt that uses describeClient() carries. */
export const PERSONAL_FIT_RULE = `Use the client's build and colouring to favour flattering colours near the face and good proportions. Mention it only when it helps the choice, in a sentence at most. Never comment negatively on the body, weight, age or skin; describe what flatters.`;
