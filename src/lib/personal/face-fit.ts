/**
 * Near-face colour fit: how well an outfit's top (and jacket, when worn)
 * suits the client's colour season. A small tie-breaker on top of the scored
 * table, never a replacement for it. Pure and deterministic.
 */
import { chroma, hexToOklab, oklabDistance, type Oklab } from "@/lib/personal/color";
import { paletteFor } from "@/lib/personal/color-season";
import type { ClothingItem, Combination } from "@/types/database";

/** Largest change face fit can make to an outfit's sort score (score points). */
export const FACE_FIT_WEIGHT = 0.4;

/** ΔE gap that counts as a clear win or loss between "flatter" and "avoid". */
const DECISIVE_GAP = 0.12;

/**
 * Fit of one colour for a season, from -1 (one of the colours to keep away
 * from the face) to +1 (squarely in the flattering palette). 0 when unknown.
 */
export function colorFit(hex: string | null | undefined, season: string | null | undefined): number {
  const palette = paletteFor(season);
  const c = hexToOklab(hex);
  if (!palette || !c) return 0;
  const nearest = (list: { hex: string }[]) =>
    Math.min(...list.map((p) => oklabDistance(c, hexToOklab(p.hex) as Oklab)));
  const gap = nearest(palette.avoid) - nearest(palette.flatter);
  // Mid greys sit between palettes: damp their effect so they stay neutral.
  // Pure white and black are strong season signals, so they are not damped.
  const midGrey = chroma(c) < 0.03 && c.L > 0.3 && c.L < 0.9;
  const damping = midGrey ? 0.5 : 1;
  return Math.max(-1, Math.min(1, (gap / DECISIVE_GAP) * damping));
}

/**
 * Weighted fit of the pieces worn near the face: the jacket frames the face
 * when there is one, with the shirt showing at the collar.
 */
export function nearFaceColorFit(
  combo: Pick<Combination, "top_id" | "outerwear_id">,
  itemsById: Map<string, Pick<ClothingItem, "color_hex">>,
  season: string | null | undefined,
): number {
  if (!paletteFor(season)) return 0;
  const top = itemsById.get(combo.top_id);
  const outer = combo.outerwear_id ? itemsById.get(combo.outerwear_id) : undefined;
  if (!top && !outer) return 0;
  if (outer && top) {
    return 0.55 * colorFit(outer.color_hex, season) + 0.45 * colorFit(top.color_hex, season);
  }
  return colorFit((outer ?? top)!.color_hex, season);
}

/** Score-point bonus (±FACE_FIT_WEIGHT) to add to an outfit's sort key. */
export function faceFitBonus(
  combo: Pick<Combination, "top_id" | "outerwear_id">,
  itemsById: Map<string, Pick<ClothingItem, "color_hex">>,
  season: string | null | undefined,
): number {
  return FACE_FIT_WEIGHT * nearFaceColorFit(combo, itemsById, season);
}
