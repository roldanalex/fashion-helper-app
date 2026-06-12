import {
  MAX_ACCESSORIES,
  MAX_CANDIDATES_PER_ITEM,
  MAX_FORMALITY_DELTA,
} from "@/lib/constants";
import type { ClothingItem } from "@/types/database";

export interface Candidate {
  top: ClothingItem;
  bottom: ClothingItem;
  shoes: ClothingItem;
  outerwear: ClothingItem | null;
  accessories: ClothingItem[];
}

/* ---------- color helpers ---------- */

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** Neutrals (white, black, grays, navies, dark browns) pair with anything. */
export function isNeutral(hex: string | null): boolean {
  if (!hex) return true;
  const hsl = hexToHsl(hex);
  if (!hsl) return true;
  if (hsl.s < 0.18) return true; // grays, off-whites
  if (hsl.l < 0.22 || hsl.l > 0.92) return true; // near-black (incl. navy), near-white
  // Earth tones: khaki, tan, brown
  if (hsl.h >= 20 && hsl.h <= 50 && hsl.s < 0.45) return true;
  return false;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

/** Reject obviously clashing color sets; the LLM refines what survives. */
function colorsWork(items: ClothingItem[]): boolean {
  const saturated = items.filter((i) => !isNeutral(i.color_hex));
  if (saturated.length > 2) return false;
  if (saturated.length === 2) {
    const a = hexToHsl(saturated[0].color_hex!);
    const b = hexToHsl(saturated[1].color_hex!);
    if (a && b) {
      const d = hueDistance(a.h, b.h);
      // Adjacent-but-not-matching hues clash; identical or complementary are fine.
      if (d > 20 && d < 100) return false;
    }
  }
  return true;
}

/* ---------- compatibility filters ---------- */

function formalityCoherent(items: ClothingItem[]): boolean {
  const levels = items
    .map((i) => i.formality_level)
    .filter((f): f is number => f != null);
  if (levels.length < 2) return true;
  return Math.max(...levels) - Math.min(...levels) <= MAX_FORMALITY_DELTA;
}

function seasonsOverlap(items: ClothingItem[]): string[] {
  let overlap: string[] | null = null;
  for (const item of items) {
    if (!item.season || item.season.length === 0) continue;
    overlap =
      overlap === null
        ? [...item.season]
        : overlap.filter((s) => item.season.includes(s));
  }
  return overlap ?? [];
}

function avgFormality(items: ClothingItem[]): number {
  const levels = items
    .map((i) => i.formality_level)
    .filter((f): f is number => f != null);
  if (levels.length === 0) return 5;
  return levels.reduce((a, b) => a + b, 0) / levels.length;
}

/** Cheap pre-LLM ranking: prefer neutral-heavy, formality-coherent sets. */
function heuristicScore(c: Candidate): number {
  const required = [c.top, c.bottom, c.shoes, ...(c.outerwear ? [c.outerwear] : [])];
  const neutrals = required.filter((i) => isNeutral(i.color_hex)).length;
  const levels = required
    .map((i) => i.formality_level)
    .filter((f): f is number => f != null);
  const spread =
    levels.length > 1 ? Math.max(...levels) - Math.min(...levels) : 0;
  return neutrals * 2 - spread + (c.outerwear ? 0.5 : 0);
}

/* ---------- candidate generation ---------- */

/**
 * Enumerate outfit candidates CONTAINING the new item — the incremental
 * core of the combination table. Pure TypeScript, zero AI cost.
 */
export function generateCandidatesForItem(
  newItem: ClothingItem,
  wardrobe: ClothingItem[],
  cap: number = MAX_CANDIDATES_PER_ITEM,
): Candidate[] {
  const usable = wardrobe.filter(
    (i) => !i.archived && i.ai_status === "confirmed" && i.id !== newItem.id,
  );
  const byCat = (cat: string) => usable.filter((i) => i.category === cat);

  const tops = newItem.category === "top" ? [newItem] : byCat("top");
  const bottoms = newItem.category === "bottom" ? [newItem] : byCat("bottom");
  const shoes = newItem.category === "shoes" ? [newItem] : byCat("shoes");
  const outerwear =
    newItem.category === "outerwear" ? [newItem] : byCat("outerwear");
  const accessories = byCat("accessory");

  const candidates: Candidate[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        // Outerwear variants: without (unless the new item IS outerwear), and with each.
        const outerwearOptions: (ClothingItem | null)[] =
          newItem.category === "outerwear" ? outerwear : [null, ...outerwear];

        for (const outer of outerwearOptions) {
          const required = [top, bottom, shoe, ...(outer ? [outer] : [])];
          if (!formalityCoherent(required)) continue;
          const seasons = seasonsOverlap(required);
          if (seasons.length === 0) continue;
          if (!colorsWork(required)) continue;

          // Accessories: the new accessory is mandatory; otherwise greedy by formality fit.
          const target = avgFormality(required);
          let accs: ClothingItem[];
          if (newItem.category === "accessory") {
            const others = accessories
              .filter(
                (a) =>
                  a.subcategory !== newItem.subcategory &&
                  Math.abs((a.formality_level ?? 5) - target) <= MAX_FORMALITY_DELTA,
              )
              .sort(
                (a, b) =>
                  Math.abs((a.formality_level ?? 5) - target) -
                  Math.abs((b.formality_level ?? 5) - target),
              );
            accs = [newItem, ...others.slice(0, MAX_ACCESSORIES - 1)];
          } else {
            accs = accessories
              .filter(
                (a) =>
                  Math.abs((a.formality_level ?? 5) - target) <= MAX_FORMALITY_DELTA,
              )
              .sort(
                (a, b) =>
                  Math.abs((a.formality_level ?? 5) - target) -
                  Math.abs((b.formality_level ?? 5) - target),
              )
              // Avoid two of the same kind (two watches, two belts).
              .filter(
                (a, idx, arr) =>
                  arr.findIndex((x) => x.subcategory === a.subcategory) === idx,
              )
              .slice(0, MAX_ACCESSORIES);
          }

          candidates.push({ top, bottom, shoes: shoe, outerwear: outer, accessories: accs });
        }
      }
    }
  }

  return candidates
    .sort((a, b) => heuristicScore(b) - heuristicScore(a))
    .slice(0, cap);
}

/** Season intersection for a candidate — stored as the backstop value. */
export function candidateSeasons(c: Candidate): string[] {
  return seasonsOverlap([
    c.top,
    c.bottom,
    c.shoes,
    ...(c.outerwear ? [c.outerwear] : []),
  ]);
}
