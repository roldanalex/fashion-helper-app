import {
  OCCASION_WEIGHTS,
  PACK_BOOST_BONUS,
  PACK_IMPROVEMENT_PASSES,
  PACK_NEW_ITEM_PENALTY,
  PACK_NEW_ITEM_PENALTY_LIGHT,
  PACK_REPEAT_PENALTY,
  PACK_REQUIRED_BONUS,
  RECO_MIN_OCCASION_SCORE,
  RECO_RELAXED_SCORE,
  type Occasion,
} from "@/lib/constants";
import { tempToSeasonBands } from "@/lib/weather-bands";
import type { ClothingItem, Combination } from "@/types/database";

/**
 * Deterministic packing optimizer.
 *
 * Given the scored combination table, a list of trip slots (one per day and
 * occasion) and the weather each slot faces, choose one existing combination
 * per slot so that the outfits suit the day AND the suitcase stays small.
 * Pure TypeScript, no AI: the stylist model only narrates the result.
 */

export interface SlotWeather {
  tempC: number | null;
  rainy: boolean;
}

export interface PackSlot {
  /** Stable key, e.g. "2026-11-03#work#0". */
  key: string;
  date: string;
  occasion: Occasion;
  weather: SlotWeather;
  /** Pieces the client wants to wear that day; each outfit takes as many as it can. */
  requireItemIds?: string[] | null;
}

export interface PackOptions {
  maxShoes?: number | null;
  maxOuterwear?: number | null;
  travelLight?: boolean | null;
  excludeItemIds?: string[] | null;
  requireItemIds?: string[] | null;
}

export interface PackedSlot {
  key: string;
  date: string;
  occasion: Occasion;
  combination: Combination | null;
  itemIds: string[];
  fit: "good" | "relaxed" | "none";
}

export interface PackResult {
  slots: PackedSlot[];
  /** Distinct item ids packed, with how many outfits each appears in. */
  uses: Map<string, number>;
  notes: string[];
}

const RAIN_UNSAFE_MATERIALS = new Set(["suede", "canvas"]);

export function occasionScore(c: Combination, occasion: Occasion): number {
  const w = OCCASION_WEIGHTS[occasion];
  return (
    (c.work_score ?? 0) * w.work +
    (c.daily_score ?? 0) * w.daily +
    (c.formality_score ?? 0) * w.formality +
    (c.old_money_score ?? 0) * w.oldMoney
  );
}

export function combinationItemIds(c: Combination): string[] {
  return [
    c.top_id,
    c.bottom_id,
    c.shoes_id,
    c.outerwear_id,
    c.watch_id,
    ...c.accessory_ids,
  ].filter((id): id is string => !!id);
}

interface Prepared {
  combo: Combination;
  itemIds: string[];
  shoesId: string;
  outerwearId: string | null;
}

function dayDistance(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.round(ms / 86400_000);
}

export function planPacking(
  combinations: Combination[],
  itemsById: Map<string, ClothingItem>,
  slots: PackSlot[],
  options: PackOptions = {},
): PackResult {
  const excluded = new Set(options.excludeItemIds ?? []);
  const required = new Set(options.requireItemIds ?? []);
  const newItemPenalty = options.travelLight
    ? PACK_NEW_ITEM_PENALTY_LIGHT
    : PACK_NEW_ITEM_PENALTY;
  const notes: string[] = [];

  // Usable combinations: visible, every piece known and not excluded.
  const prepared: Prepared[] = [];
  for (const combo of combinations) {
    if (combo.hidden) continue;
    const itemIds = combinationItemIds(combo);
    if (itemIds.some((id) => !itemsById.has(id) || excluded.has(id))) continue;
    prepared.push({
      combo,
      itemIds,
      shoesId: combo.shoes_id,
      outerwearId: combo.outerwear_id,
    });
  }

  // Eligible candidates per slot, by weather and occasion.
  const eligible = new Map<string, { list: Prepared[]; fit: "good" | "relaxed" }>();
  for (const slot of slots) {
    const bands =
      slot.weather.tempC == null ? null : new Set(tempToSeasonBands(slot.weather.tempC));
    const weatherOk = (p: Prepared) => {
      if (bands && !p.combo.season_suitability.some((s) => bands.has(s))) return false;
      if (slot.weather.rainy) {
        const shoes = itemsById.get(p.shoesId);
        if (shoes?.material && RAIN_UNSAFE_MATERIALS.has(shoes.material)) return false;
      }
      return true;
    };
    const pool = prepared.filter(weatherOk);
    const atLeast = (min: number) =>
      pool.filter((p) => occasionScore(p.combo, slot.occasion) >= min);
    let list = atLeast(RECO_MIN_OCCASION_SCORE);
    let fit: "good" | "relaxed" = "good";
    if (list.length === 0) {
      list = atLeast(RECO_RELAXED_SCORE);
      fit = "relaxed";
    }
    if (list.length === 0) {
      list = pool;
      fit = "relaxed";
    }
    // Pieces named for this day: keep every weather-suitable outfit that
    // wears at least one of them (two pairs of shoes can never share one
    // outfit, so "all of them" would be the wrong test).
    const wanted = (slot.requireItemIds ?? []).filter((id) => itemsById.has(id));
    if (wanted.length) {
      const withWanted = pool.filter((p) => wanted.some((id) => p.itemIds.includes(id)));
      if (withWanted.length) {
        list = withWanted;
        fit = withWanted.some((p) => occasionScore(p.combo, slot.occasion) >= RECO_MIN_OCCASION_SCORE)
          ? "good"
          : "relaxed";
      }
    }
    eligible.set(slot.key, { list, fit });
  }

  // Greedy assignment, then a few local-improvement passes: each slot is
  // re-chosen against the pack implied by every other slot.
  const chosen = new Map<string, Prepared | null>();
  const packFromOthers = (except: string) => {
    const pack = new Set<string>();
    const shoes = new Set<string>();
    const outerwear = new Set<string>();
    for (const [key, p] of chosen) {
      if (key === except || !p) continue;
      p.itemIds.forEach((id) => pack.add(id));
      shoes.add(p.shoesId);
      if (p.outerwearId) outerwear.add(p.outerwearId);
    }
    return { pack, shoes, outerwear };
  };

  const scoreFor = (
    slot: PackSlot,
    p: Prepared,
    ctx: ReturnType<typeof packFromOthers>,
  ): number => {
    let score = occasionScore(p.combo, slot.occasion);
    if (p.combo.boosted) score += PACK_BOOST_BONUS;
    const temp = slot.weather.tempC;
    if (temp != null && temp < 15 && p.outerwearId) score += 0.5;
    if (temp != null && temp >= 27 && p.outerwearId) score -= 1;
    const newItems = p.itemIds.filter((id) => !ctx.pack.has(id)).length;
    score -= newItems * newItemPenalty;
    if (required.size) {
      score += p.itemIds.filter((id) => required.has(id)).length * PACK_REQUIRED_BONUS;
    }
    // Pieces named for this day: a bonus for each one worn, doubled when no
    // other outfit that day wears it yet, so they spread across the day.
    const wanted = slot.requireItemIds ?? [];
    if (wanted.length) {
      const wornToday = new Set<string>();
      for (const [key, other] of chosen) {
        if (key === slot.key || !other) continue;
        const otherSlot = slots.find((s) => s.key === key);
        if (otherSlot?.date === slot.date) other.itemIds.forEach((id) => wornToday.add(id));
      }
      for (const id of wanted) {
        if (!p.itemIds.includes(id)) continue;
        score += PACK_REQUIRED_BONUS * (wornToday.has(id) ? 1 : 2);
      }
    }
    // The same full outfit on neighbouring days reads as repetition.
    for (const [key, other] of chosen) {
      if (key === slot.key || !other || other.combo.id !== p.combo.id) continue;
      const otherSlot = slots.find((s) => s.key === key);
      if (otherSlot && dayDistance(otherSlot.date, slot.date) <= 1) {
        score -= PACK_REPEAT_PENALTY;
      }
    }
    return score;
  };

  const withinCaps = (p: Prepared, ctx: ReturnType<typeof packFromOthers>) => {
    if (
      options.maxShoes != null &&
      !ctx.shoes.has(p.shoesId) &&
      ctx.shoes.size >= options.maxShoes
    )
      return false;
    if (
      options.maxOuterwear != null &&
      p.outerwearId &&
      !ctx.outerwear.has(p.outerwearId) &&
      ctx.outerwear.size >= options.maxOuterwear
    )
      return false;
    return true;
  };

  let capRelaxed = false;
  const pick = (slot: PackSlot): Prepared | null => {
    const { list } = eligible.get(slot.key)!;
    if (list.length === 0) return null;
    const ctx = packFromOthers(slot.key);
    let candidates = list.filter((p) => withinCaps(p, ctx));
    if (candidates.length === 0) {
      candidates = list;
      capRelaxed = true;
    }
    let best: Prepared | null = null;
    let bestScore = -Infinity;
    for (const p of candidates) {
      const s = scoreFor(slot, p, ctx);
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    return best;
  };

  for (const slot of slots) chosen.set(slot.key, pick(slot));
  for (let pass = 0; pass < PACK_IMPROVEMENT_PASSES; pass++) {
    let changed = false;
    for (const slot of slots) {
      const next = pick(slot);
      if (next?.combo.id !== chosen.get(slot.key)?.combo.id) {
        chosen.set(slot.key, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Guarantee: every piece the client insists on is worn at least once if any
  // slot can take it, even when reuse would have left it at home.
  const inPack = () => {
    const ids = new Set<string>();
    for (const p of chosen.values()) p?.itemIds.forEach((id) => ids.add(id));
    return ids;
  };
  for (const id of required) {
    if (inPack().has(id)) continue;
    let best: { slot: PackSlot; p: Prepared; score: number } | null = null;
    for (const slot of slots) {
      const ctx = packFromOthers(slot.key);
      for (const p of eligible.get(slot.key)!.list) {
        if (!p.itemIds.includes(id)) continue;
        const score = scoreFor(slot, p, ctx);
        if (!best || score > best.score) best = { slot, p, score };
      }
    }
    if (best) chosen.set(best.slot.key, best.p);
  }

  // One caveat per day for named pieces that no outfit that day could wear.
  const byDate = new Map<string, { wanted: Set<string>; worn: Set<string> }>();
  for (const slot of slots) {
    const entry = byDate.get(slot.date) ?? { wanted: new Set(), worn: new Set() };
    (slot.requireItemIds ?? []).forEach((id) => itemsById.has(id) && entry.wanted.add(id));
    chosen.get(slot.key)?.itemIds.forEach((id) => entry.worn.add(id));
    byDate.set(slot.date, entry);
  }
  for (const [date, { wanted, worn }] of byDate) {
    const left = [...wanted].filter((id) => !worn.has(id));
    if (!left.length) continue;
    const names = left.map((id) => itemsById.get(id)!.name);
    notes.push(
      `${names.join(" and ")} ${left.length > 1 ? "were" : "was"} not worn on ${date}: no outfit that suits that day's plans and weather includes ${left.length > 1 ? "them" : "it"}.`,
    );
  }

  // Assemble.
  const uses = new Map<string, number>();
  const packed: PackedSlot[] = slots.map((slot) => {
    const p = chosen.get(slot.key) ?? null;
    if (p) for (const id of p.itemIds) uses.set(id, (uses.get(id) ?? 0) + 1);
    return {
      key: slot.key,
      date: slot.date,
      occasion: slot.occasion,
      combination: p?.combo ?? null,
      itemIds: p?.itemIds ?? [],
      fit: p ? eligible.get(slot.key)!.fit : "none",
    };
  });

  const missing = packed.filter((s) => s.fit === "none");
  if (missing.length) {
    notes.push(
      `No outfit in the table suits ${missing
        .map((s) => `${s.occasion} on ${s.date}`)
        .join(", ")} in that weather; the Shop tab can show which piece would fill the gap.`,
    );
  }
  const loose = packed.filter((s) => s.fit === "relaxed");
  if (loose.length) {
    notes.push(
      `The score floor was lowered for ${loose.length} outfit${loose.length > 1 ? "s" : ""}; they work, but they are not the table's strongest looks for that occasion.`,
    );
  }
  if (capRelaxed) {
    notes.push(
      "The shoe or outerwear limit could not be met for every day without leaving a day unplanned, so it was relaxed where needed.",
    );
  }
  const requiredMissing = [...required].filter((id) => !uses.has(id));
  if (requiredMissing.length) {
    notes.push(
      `${requiredMissing
        .map((id) => itemsById.get(id)?.name ?? id)
        .join(", ")} could not be worked into any suitable outfit for these days.`,
    );
  }

  return { slots: packed, uses, notes };
}
