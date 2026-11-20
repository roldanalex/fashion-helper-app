import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { geocode, getTodayWeather, weatherFlags } from "@/lib/weather";
import { rerankAndExplain } from "@/lib/ai/reranking";
import { enrichCombinations } from "@/lib/combinations/enrich";
import { seasonOf } from "@/lib/personal/client-profile";
import { personSessionOr404 } from "@/lib/people/session";
import { suitsWeather } from "@/lib/trips/weather-fit";
import { aiLanguageRule } from "@/i18n/config";
import { faceFitBonus } from "@/lib/personal/face-fit";
import {
  MAX_DAILY_ACCESSORIES,
  OCCASION_WEIGHTS,
  RECO_CANDIDATE_POOL,
  RECO_MIN_OCCASION_SCORE,
  RECO_MIN_PICKS,
  RECO_RELAXED_SCORE,
  FRESHNESS_DAYS,
  type Occasion,
} from "@/lib/constants";
import type {
  ClothingItem,
  Combination,
  RankedRecommendation,
  WeatherSnapshot,
} from "@/types/database";

export const maxDuration = 60;

function occasionScore(c: Combination, occasion: Occasion): number {
  const w = OCCASION_WEIGHTS[occasion];
  return (
    (c.work_score ?? 0) * w.work +
    (c.daily_score ?? 0) * w.daily +
    (c.formality_score ?? 0) * w.formality +
    (c.old_money_score ?? 0) * w.oldMoney
  );
}

function isFresh(c: Combination): boolean {
  if (!c.last_recommended) return true;
  const age = Date.now() - new Date(c.last_recommended).getTime();
  return age > FRESHNESS_DAYS * 86400_000;
}

export async function POST(request: Request) {
  const t = await getTranslations("today");
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const occasion: Occasion | undefined = body.occasion;
  const destination: string | undefined = body.destination?.trim() || undefined;
  const notes: string | undefined = body.notes?.trim() || undefined;
  const force: boolean = !!body.force;
  const personId: string | undefined = typeof body.personId === "string" ? body.personId : undefined;
  // Verified coordinates from the autocomplete — used directly, no re-geocode.
  const destLat: number | undefined =
    typeof body.destLat === "number" ? body.destLat : undefined;
  const destLon: number | undefined =
    typeof body.destLon === "number" ? body.destLon : undefined;

  if (!occasion || !(occasion in OCCASION_WEIGHTS)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: t("errors.occasionRequired") } },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const { session, deny: notFound } = await personSessionOr404(supabase, user, personId);
  if (notFound) return notFound;
  const { wardrobe, active } = session;

  // Reuse today's stored plan — reloads cost zero AI calls.
  if (!force) {
    const existing = await wardrobe.plan(today, occasion);
    if (existing?.recommendations?.length) {
      const picks = existing.recommendations as RankedRecommendation[];
      const combos = await wardrobe.outfitsByIds(picks.map((r) => r.combination_id));
      const enriched = await enrichCombinations(
        supabase,
        wardrobe,
        withDailyAccessories(combos, picks),
      );
      return NextResponse.json({
        plan: existing,
        weather: existing.weather,
        outfits: attachExplanations(enriched, picks),
        cached: true,
      });
    }
  }

  // The Family's home (from the Account) and the Person's own styles and traits.
  const profile = session.accountProfile;

  // Resolve where the day happens
  let lat = profile?.home_lat;
  let lon = profile?.home_lon;
  let locationName = profile?.home_location ?? "your area";
  try {
    if (destination && destLat != null && destLon != null) {
      // User picked a verified place from the autocomplete.
      lat = destLat;
      lon = destLon;
      locationName = destination;
    } else if (destination) {
      const geo = await geocode(destination);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
        locationName = [geo.name, geo.state, geo.country]
          .filter(Boolean)
          .join(", ");
      }
    } else if ((lat == null || lon == null) && profile?.home_location) {
      const geo = await geocode(profile.home_location);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
      }
    }
  } catch (err) {
    console.error("Geocoding failed:", err);
  }

  if (lat == null || lon == null) {
    return NextResponse.json(
      {
        error: {
          code: "no_location",
          message: t("errors.noLocation"),
        },
      },
      { status: 422 },
    );
  }

  let weather: WeatherSnapshot;
  try {
    weather = await getTodayWeather(lat, lon, locationName, session.locale);
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "weather_failed",
          message: t("errors.weatherFailed"),
        },
      },
      { status: 502 },
    );
  }

  const flags = weatherFlags(weather);

  // Deterministic stage: filter + rank the combination table.
  let pool = await wardrobe.outfits({ seasonsAny: flags.seasonBands, limit: 200 });

  // Rain rule needs shoe materials.
  if (flags.rainy && pool.length > 0) {
    const shoeIds = [...new Set(pool.map((c) => c.shoes_id))];
    const shoesData = await wardrobe.pieces({ ids: shoeIds });
    const shoesById = new Map(shoesData.map((p) => [p.id, p]));
    pool = pool.filter((c) => suitsWeather(c, shoesById, { tempC: null, rainy: true }));
  }

  // Personal fit: a small bonus for colours that flatter near the face. It
  // only reorders close calls; thresholds still use the table's own scores.
  const colorSeason = seasonOf(active.personal);
  const faceBonus = new Map<string, number>();
  if (colorSeason && pool.length > 0) {
    const faceIds = [
      ...new Set(pool.flatMap((c) => [c.top_id, c.outerwear_id]).filter(Boolean) as string[]),
    ];
    const faceItems = await wardrobe.pieces({ ids: faceIds });
    const colorsById = new Map(faceItems.map((i) => [i.id, i]));
    for (const c of pool) faceBonus.set(c.id, faceFitBonus(c, colorsById, colorSeason));
  }
  const sortKey = (c: Combination) => occasionScore(c, occasion) + (faceBonus.get(c.id) ?? 0);

  const select = (minScore: number) =>
    pool
      .filter((c) => occasionScore(c, occasion) >= minScore)
      .sort(
        (a, b) =>
          Number(b.boosted) - Number(a.boosted) ||
          Number(isFresh(b)) - Number(isFresh(a)) ||
          sortKey(b) - sortKey(a) ||
          (b.weather_suitability_score ?? 0) - (a.weather_suitability_score ?? 0) ||
          // Cold days favor combinations with outerwear.
          (flags.cold
            ? Number(!!b.outerwear_id) - Number(!!a.outerwear_id)
            : 0),
      )
      .slice(0, RECO_CANDIDATE_POOL);

  let candidates = select(RECO_MIN_OCCASION_SCORE);
  if (candidates.length < 3) candidates = select(RECO_RELAXED_SCORE);

  if (candidates.length === 0) {
    return NextResponse.json({
      plan: null,
      weather,
      outfits: [],
      empty: true,
    });
  }

  // Watch and accessory pools: every confirmed piece, so the stylist can pick
  // the right watch or belt for the day rather than the table's default.
  const ownedExtras = await wardrobe.pieces({ confirmed: true, categories: ["watch", "accessory"] });
  const watchPool = ownedExtras.filter((i) => i.category === "watch");
  const accessoryPool = ownedExtras.filter((i) => i.category === "accessory");
  const watchIds = new Set(watchPool.map((w) => w.id));
  const accessoryById = new Map(accessoryPool.map((a) => [a.id, a]));

  // LLM stage: one gpt-4o-mini call to rank, accessorize and explain.
  const enrichedAll = await enrichCombinations(supabase, wardrobe, candidates);
  const itemsById = new Map<string, ClothingItem>();
  for (const e of enrichedAll)
    for (const s of e.slots) itemsById.set(s.item.id, s.item);

  const fallbackPicks = (): RankedRecommendation[] =>
    candidates.slice(0, RECO_MIN_PICKS).map((c, i) => ({
      combination_id: c.id,
      rank: i + 1,
      watch_id: c.watch_id,
      accessory_ids: c.accessory_ids,
      explanation: c.notes ?? t("fallbackExplanation"),
    }));

  let picks: RankedRecommendation[];
  try {
    const result = await rerankAndExplain({
      candidates,
      itemsById,
      watchPool,
      accessoryPool,
      weather,
      occasion,
      notes,
      subject: active.subject,
      languageRule: aiLanguageRule(session.locale),
    });
    const valid = new Map(candidates.map((c) => [c.id, c]));
    picks = result.picks
      .filter((p) => valid.has(p.combination_id))
      .sort((a, b) => a.rank - b.rank)
      .map((p) => ({
        combination_id: p.combination_id,
        rank: p.rank,
        explanation: p.explanation,
        // Only a watch the client owns; otherwise keep the outfit's default.
        watch_id:
          p.watch_id && watchIds.has(p.watch_id)
            ? p.watch_id
            : valid.get(p.combination_id)!.watch_id,
        accessory_ids: sanitizeAccessories(
          p.accessory_ids,
          accessoryById,
          valid.get(p.combination_id)!.accessory_ids,
        ),
      }));
  } catch (err) {
    console.error("Re-ranking failed, falling back to top scores:", err);
    picks = fallbackPicks();
  }
  if (picks.length === 0) picks = fallbackPicks();

  // Persist the plan; mark combos as recommended for freshness tracking.
  const plan = await wardrobe.savePlan({
    plan_date: today,
    occasion,
    destination: destination ?? null,
    dest_lat: lat,
    dest_lon: lon,
    notes: notes ?? null,
    weather,
    recommendations: picks,
  });
  await wardrobe.markRecommended(picks.map((p) => p.combination_id));

  const pickedSet = new Set(picks.map((p) => p.combination_id));
  const enrichedPicked = await enrichCombinations(
    supabase,
    wardrobe,
    withDailyAccessories(
      candidates.filter((c) => pickedSet.has(c.id)),
      picks,
    ),
  );

  return NextResponse.json({
    plan,
    weather,
    outfits: attachExplanations(enrichedPicked, picks),
    cached: false,
  });
}

/**
 * Keep only ids the client actually owns, one per accessory type, capped.
 * Falls back to the combination's stored accessories when the model returns
 * nothing usable.
 */
function sanitizeAccessories(
  ids: string[] | undefined,
  pool: Map<string, ClothingItem>,
  fallback: string[],
): string[] {
  const seenTypes = new Set<string | null>();
  const out: string[] = [];
  for (const id of ids ?? []) {
    const item = pool.get(id);
    if (!item || seenTypes.has(item.subcategory)) continue;
    seenTypes.add(item.subcategory);
    out.push(id);
    if (out.length >= MAX_DAILY_ACCESSORIES) break;
  }
  return out.length > 0 ? out : fallback;
}

/** Swap each combination's watch and accessories for the day's choices. */
function withDailyAccessories(
  combos: Combination[],
  picks: RankedRecommendation[],
): Combination[] {
  const byId = new Map(picks.map((p) => [p.combination_id, p]));
  return combos.map((c) => {
    const pick = byId.get(c.id);
    if (!pick) return c;
    return {
      ...c,
      watch_id: pick.watch_id ?? c.watch_id,
      accessory_ids: pick.accessory_ids?.length
        ? pick.accessory_ids
        : c.accessory_ids,
    };
  });
}

function attachExplanations(
  enriched: Awaited<ReturnType<typeof enrichCombinations>>,
  picks: RankedRecommendation[],
) {
  const byId = new Map(enriched.map((e) => [e.combination.id, e]));
  return picks
    .map((p) => {
      const e = byId.get(p.combination_id);
      if (!e) return null;
      return { ...e, rank: p.rank, explanation: p.explanation };
    })
    .filter(Boolean)
    .sort((a, b) => a!.rank - b!.rank);
}
