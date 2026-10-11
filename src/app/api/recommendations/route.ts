import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { geocode, getTodayWeather, weatherFlags } from "@/lib/weather";
import { rerankAndExplain } from "@/lib/ai/reranking";
import { enrichCombinations } from "@/lib/combinations/enrich";
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
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const occasion: Occasion | undefined = body.occasion;
  const destination: string | undefined = body.destination?.trim() || undefined;
  const notes: string | undefined = body.notes?.trim() || undefined;
  const force: boolean = !!body.force;
  // Verified coordinates from the autocomplete — used directly, no re-geocode.
  const destLat: number | undefined =
    typeof body.destLat === "number" ? body.destLat : undefined;
  const destLon: number | undefined =
    typeof body.destLon === "number" ? body.destLon : undefined;

  if (!occasion || !(occasion in OCCASION_WEIGHTS)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Valid occasion is required" } },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // Reuse today's stored plan — reloads cost zero AI calls.
  if (!force) {
    const { data: existing } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_date", today)
      .eq("occasion", occasion)
      .maybeSingle();
    if (existing?.recommendations?.length) {
      const picks = existing.recommendations as RankedRecommendation[];
      const combos = await fetchCombosByIds(
        supabase,
        picks.map((r) => r.combination_id),
      );
      const enriched = await enrichCombinations(
        supabase,
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

  // Profile (home location + styles)
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_location, home_lat, home_lon, style_preferences")
    .eq("id", user.id)
    .single();

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
          message:
            "I couldn't place that destination. Try a city name, or set your home location in Settings.",
        },
      },
      { status: 422 },
    );
  }

  let weather: WeatherSnapshot;
  try {
    weather = await getTodayWeather(lat, lon, locationName);
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "weather_failed",
          message: "Couldn't reach the weather service. Try again shortly.",
        },
      },
      { status: 502 },
    );
  }

  const flags = weatherFlags(weather);

  // Deterministic stage: filter + rank the combination table.
  const { data: comboData } = await supabase
    .from("combinations")
    .select("*")
    .eq("user_id", user.id)
    .eq("hidden", false)
    .overlaps("season_suitability", flags.seasonBands)
    .order("overall_score", { ascending: false })
    .limit(200);
  let pool = (comboData ?? []) as Combination[];

  // Rain rule needs shoe materials.
  if (flags.rainy && pool.length > 0) {
    const shoeIds = [...new Set(pool.map((c) => c.shoes_id))];
    const { data: shoesData } = await supabase
      .from("clothing_items")
      .select("id, material")
      .in("id", shoeIds);
    const badShoes = new Set(
      (shoesData ?? [])
        .filter((s) => s.material === "suede" || s.material === "canvas")
        .map((s) => s.id),
    );
    pool = pool.filter((c) => !badShoes.has(c.shoes_id));
  }

  const select = (minScore: number) =>
    pool
      .filter((c) => occasionScore(c, occasion) >= minScore)
      .sort(
        (a, b) =>
          Number(b.boosted) - Number(a.boosted) ||
          Number(isFresh(b)) - Number(isFresh(a)) ||
          occasionScore(b, occasion) - occasionScore(a, occasion) ||
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

  // Accessory pool: every confirmed accessory, so the stylist can pick the
  // right watch or belt for the day rather than the table's default.
  const { data: accessoryData } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("category", "accessory")
    .eq("archived", false)
    .eq("ai_status", "confirmed");
  const accessoryPool = (accessoryData ?? []) as ClothingItem[];
  const accessoryById = new Map(accessoryPool.map((a) => [a.id, a]));

  // LLM stage: one gpt-4o-mini call to rank, accessorize and explain.
  const enrichedAll = await enrichCombinations(supabase, candidates);
  const itemsById = new Map<string, ClothingItem>();
  for (const e of enrichedAll)
    for (const s of e.slots) itemsById.set(s.item.id, s.item);

  const fallbackPicks = (): RankedRecommendation[] =>
    candidates.slice(0, RECO_MIN_PICKS).map((c, i) => ({
      combination_id: c.id,
      rank: i + 1,
      accessory_ids: c.accessory_ids,
      explanation: c.notes ?? "A reliably strong combination from your table.",
    }));

  let picks: RankedRecommendation[];
  try {
    const result = await rerankAndExplain({
      candidates,
      itemsById,
      accessoryPool,
      weather,
      occasion,
      notes,
      stylePreferences: profile?.style_preferences ?? [],
    });
    const valid = new Map(candidates.map((c) => [c.id, c]));
    picks = result.picks
      .filter((p) => valid.has(p.combination_id))
      .sort((a, b) => a.rank - b.rank)
      .map((p) => ({
        combination_id: p.combination_id,
        rank: p.rank,
        explanation: p.explanation,
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
  const { data: plan } = await supabase
    .from("daily_plans")
    .upsert(
      {
        user_id: user.id,
        plan_date: today,
        occasion,
        destination: destination ?? null,
        dest_lat: lat,
        dest_lon: lon,
        notes: notes ?? null,
        weather,
        recommendations: picks,
      },
      { onConflict: "user_id,plan_date,occasion" },
    )
    .select()
    .single();

  await supabase
    .from("combinations")
    .update({ last_recommended: new Date().toISOString() })
    .in(
      "id",
      picks.map((p) => p.combination_id),
    );

  const pickedSet = new Set(picks.map((p) => p.combination_id));
  const enrichedPicked = await enrichCombinations(
    supabase,
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

/** Swap each combination's accessories for the ones chosen for the day. */
function withDailyAccessories(
  combos: Combination[],
  picks: RankedRecommendation[],
): Combination[] {
  const byId = new Map(picks.map((p) => [p.combination_id, p]));
  return combos.map((c) => {
    const pick = byId.get(c.id);
    return pick?.accessory_ids?.length
      ? { ...c, accessory_ids: pick.accessory_ids }
      : c;
  });
}

async function fetchCombosByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Combination[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("combinations").select("*").in("id", ids);
  return (data ?? []) as Combination[];
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
