/**
 * Family looks: one Outfit per Person for the same occasion, chosen so they
 * work together. Pure and deterministic; no AI. Outfits come only from each
 * Person's own Outfit table, so a look never invents or mixes clothes.
 *
 * Score of a look =
 *     Σ each Person's occasion score (+ near-face colour bonus)
 *   + palette cohesion between every pair (weighted by mode)
 *   − formality spread between adults (and, more gently, children vs adults)
 *   − a small "clone" penalty when two adults wear near-identical colourways
 *     (except in matching mode; a parent and child in the same colours is a
 *     look families often want)
 * Searched with a beam over each Person's shortlist.
 */
import { faceFitBonus } from "@/lib/personal/face-fit";
import { chroma, hexToOklab, oklabDistance, type Oklab } from "@/lib/personal/color";
import { occasionScore } from "@/lib/trips/pack";
import { suitsWeather, type DayWeather } from "@/lib/trips/weather-fit";
import {
  FAMILY_ADULT_FORMALITY_TOLERANCE,
  FAMILY_BEAM_WIDTH,
  FAMILY_BOOST_BONUS,
  FAMILY_CHILD_FORMALITY_TOLERANCE,
  FAMILY_CLONE_PENALTY,
  FAMILY_COHESION_WEIGHT,
  FAMILY_LOOKS,
  FAMILY_SHORTLIST,
  RECO_RELAXED_SCORE,
  type Occasion,
} from "@/lib/constants";
import type { ColorSeason } from "@/lib/personal/color-season";
import type { Audience } from "@/lib/people/subject";
import type { ClothingItem, Combination } from "@/types/database";

export type LookMode = "coordinated" | "matching" | "relaxed";

export interface MemberInput {
  personId: string;
  audience: Audience;
  colorSeason: ColorSeason | null;
  outfits: Combination[];
  pieces: ClothingItem[];
}

export interface CoordinateInput {
  members: MemberInput[];
  occasion: Occasion;
  weather: DayWeather;
  mode: LookMode;
  /** Outfits considered per Person (default 15). */
  shortlist?: number;
  /** Partial looks kept per step (default 50). */
  beamWidth?: number;
  /** Looks returned (default 3). */
  looks?: number;
}

export interface FamilyLook {
  picks: { personId: string; outfitId: string }[];
  score: number;
  /** The look's main colours, for a palette strip. */
  palette: string[];
}

export type MissingReason = "no_outfits" | "no_weather_match";

export interface CoordinateResult {
  looks: FamilyLook[];
  missing: { personId: string; reason: MissingReason }[];
  /** People dressed in their closest outfit because nothing really suits the occasion. */
  looseFits: string[];
}

interface Candidate {
  personId: string;
  audience: Audience;
  outfit: Combination;
  base: number;
  formality: number;
  colors: { hex: string; lab: Oklab }[];
}


function mainColors(outfit: Combination, byId: Map<string, ClothingItem>) {
  return [outfit.top_id, outfit.bottom_id, outfit.outerwear_id]
    .map((id) => (id ? byId.get(id)?.color_hex : null))
    .filter((hex): hex is string => !!hex)
    .map((hex) => ({ hex, lab: hexToOklab(hex) }))
    .filter((c): c is { hex: string; lab: Oklab } => !!c.lab);
}

/** 1 when two colours are the same, falling to 0 at ΔE 0.25. */
const affinity = (a: Oklab, b: Oklab) => Math.max(0, 1 - oklabDistance(a, b) / 0.25);

function pairCohesion(x: Candidate, y: Candidate, mode: LookMode): number {
  if (!x.colors.length || !y.colors.length) return 0;
  const consider = (c: { lab: Oklab }) => mode !== "matching" || chroma(c.lab) > 0.05;
  let best = 0;
  for (const a of x.colors.filter(consider))
    for (const b of y.colors.filter(consider)) best = Math.max(best, affinity(a.lab, b.lab));
  return best * FAMILY_COHESION_WEIGHT[mode];
}

function isClone(x: Candidate, y: Candidate): boolean {
  if (x.colors.length < 2 || y.colors.length < 2) return false;
  return x.colors.slice(0, 2).every((c, i) => oklabDistance(c.lab, y.colors[i].lab) < 0.04);
}

function formalityPenalty(x: Candidate, y: Candidate): number {
  const both = x.audience === "adult" && y.audience === "adult";
  const tolerance = both ? FAMILY_ADULT_FORMALITY_TOLERANCE : FAMILY_CHILD_FORMALITY_TOLERANCE;
  const weight = both ? 1 : 0.5;
  return Math.max(0, Math.abs(x.formality - y.formality) - tolerance) * weight;
}

function pairScore(x: Candidate, y: Candidate, mode: LookMode): number {
  return (
    pairCohesion(x, y, mode) -
    formalityPenalty(x, y) -
    (mode !== "matching" && x.audience === "adult" && y.audience === "adult" && isClone(x, y)
      ? FAMILY_CLONE_PENALTY
      : 0)
  );
}

export function coordinateFamily(input: CoordinateInput): CoordinateResult {
  const { occasion, weather, mode } = input;
  const shortlistSize = input.shortlist ?? FAMILY_SHORTLIST;
  const beamWidth = input.beamWidth ?? FAMILY_BEAM_WIDTH;
  const lookCount = input.looks ?? FAMILY_LOOKS;

  const missing: CoordinateResult["missing"] = [];
  const looseFits: string[] = [];
  const shortlists: Candidate[][] = [];

  for (const m of input.members) {
    if (m.outfits.length === 0) {
      missing.push({ personId: m.personId, reason: "no_outfits" });
      continue;
    }
    const byId = new Map(m.pieces.map((p) => [p.id, p]));
    const suitable = m.outfits.filter((o) => suitsWeather(o, byId, weather));
    if (suitable.length === 0) {
      missing.push({ personId: m.personId, reason: "no_weather_match" });
      continue;
    }
    const scored = suitable.map((o) => ({ o, s: occasionScore(o, occasion) }));
    const fitting = scored.filter((x) => x.s >= RECO_RELAXED_SCORE);
    if (fitting.length === 0) looseFits.push(m.personId);
    const pool = (fitting.length ? fitting : scored)
      .map(({ o, s }) => ({
        personId: m.personId,
        audience: m.audience,
        outfit: o,
        base: s + (o.boosted ? FAMILY_BOOST_BONUS : 0) + faceFitBonus(o, byId, m.colorSeason),
        formality: o.formality_score ?? 5,
        colors: mainColors(o, byId),
      }))
      .sort((a, b) => b.base - a.base || a.outfit.id.localeCompare(b.outfit.id))
      .slice(0, shortlistSize);
    shortlists.push(pool);
  }

  if (shortlists.length === 0) return { looks: [], missing, looseFits };

  // Beam search across People, scoring pairs as each Person is added.
  type State = { picks: Candidate[]; score: number };
  let beam: State[] = [{ picks: [], score: 0 }];
  for (const list of shortlists) {
    const next: State[] = [];
    for (const state of beam) {
      for (const c of list) {
        let score = state.score + c.base;
        for (const p of state.picks) score += pairScore(p, c, mode);
        next.push({ picks: [...state.picks, c], score });
      }
    }
    next.sort(
      (a, b) =>
        b.score - a.score ||
        a.picks.map((p) => p.outfit.id).join().localeCompare(b.picks.map((p) => p.outfit.id).join()),
    );
    beam = next.slice(0, beamWidth);
  }

  const looks = beam.slice(0, lookCount).map<FamilyLook>((state) => ({
    picks: state.picks.map((c) => ({ personId: c.personId, outfitId: c.outfit.id })),
    score: Math.round(state.score * 100) / 100,
    palette: [...new Set(state.picks.flatMap((c) => c.colors.map((x) => x.hex)))],
  }));

  return { looks, missing, looseFits };
}
