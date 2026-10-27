import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { geocode, getTripForecast, locationLabel } from "@/lib/weather";
import {
  combinationItemIds,
  occasionScore,
  planPacking,
  type PackSlot,
} from "@/lib/trips/pack";
import { tempToSeasonBands } from "@/lib/weather-bands";
import { expandDateRange, isIsoDate } from "@/lib/trips/dates";
import type {
  FindOutfitsInput,
  FindOutfitsResult,
  OutfitOption,
  OutfitWeather,
  PlanTripInput,
  PlanTripResult,
  TripDayPlan,
  TripItemSummary,
  TripPlan,
} from "@/lib/trips/schema";
import {
  CATEGORIES,
  RECO_MIN_OCCASION_SCORE,
  RECO_RELAXED_SCORE,
  TRIP_MAX_DAYS,
  type Occasion,
} from "@/lib/constants";
import type { ClothingItem, Combination, WeatherSnapshot } from "@/types/database";

const CATEGORY_ORDER = new Map(CATEGORIES.map((c, i) => [c, i]));

/**
 * The plan_trip tool: resolve the destination and forecast, lay the trip out
 * as day × occasion slots, run the deterministic packer over the client's
 * combination table, and return a compact plan for the card and the model.
 */
export async function planTrip(
  supabase: SupabaseClient,
  userId: string,
  input: PlanTripInput,
): Promise<PlanTripResult> {
  if (!isIsoDate(input.start_date) || !isIsoDate(input.end_date)) {
    return { ok: false, reason: "Dates must be YYYY-MM-DD; resolve them from today's date and call again." };
  }
  const notes: string[] = [];
  const dates = expandDateRange(input.start_date, input.end_date, TRIP_MAX_DAYS);
  if (expandDateRange(input.start_date, input.end_date).length > dates.length) {
    notes.push(`Trips are planned up to ${TRIP_MAX_DAYS} days; the plan covers the first ${TRIP_MAX_DAYS}.`);
  }

  // Where
  let geo: Awaited<ReturnType<typeof geocode>> = null;
  try {
    geo = await geocode(input.destination);
  } catch (err) {
    console.error("Trip geocoding failed:", err);
    return { ok: false, reason: "The location service did not answer. Ask the client to try again in a moment." };
  }
  if (!geo) {
    return {
      ok: false,
      reason: `"${input.destination}" did not match any place. Ask the client for the city and country (for a US city, the state and "US"), then call again.`,
    };
  }
  const locationName = locationLabel(geo);

  // Weather: the forecast where it reaches, the model's climate estimate after.
  let forecast: Record<string, WeatherSnapshot> = {};
  try {
    forecast = await getTripForecast(geo.lat, geo.lon, locationName);
  } catch (err) {
    console.error("Trip forecast failed:", err);
    notes.push("The weather service did not answer, so the plan uses the expected temperature instead of a forecast.");
  }
  const estimatedDays: string[] = [];
  const unknownDays: string[] = [];

  // What happens each day
  const byDate = new Map(input.days.map((d) => [d.date, d]));
  const assumed: string[] = [];
  const days: TripDayPlan[] = dates.map((date) => {
    const spec = byDate.get(date);
    const occasions: Occasion[] = spec?.occasions?.length ? spec.occasions : ["errands"];
    if (!spec) assumed.push(date);
    const snap = forecast[date];
    let weather: TripDayPlan["weather"];
    if (snap) {
      weather = {
        source: "forecast",
        tempC: snap.tempC,
        tempMinC: snap.tempMinC,
        tempMaxC: snap.tempMaxC,
        precipProb: snap.precipProb,
        condition: snap.condition,
      };
    } else if (input.expected_temp_c != null) {
      estimatedDays.push(date);
      weather = {
        source: "estimate",
        tempC: input.expected_temp_c,
        tempMinC: null,
        tempMaxC: null,
        precipProb: input.expected_rain ? 60 : null,
        condition: input.expected_rain ? "Rain" : null,
      };
    } else {
      unknownDays.push(date);
      weather = {
        source: "unknown",
        tempC: null,
        tempMinC: null,
        tempMaxC: null,
        precipProb: null,
        condition: null,
      };
    }
    return {
      date,
      weather,
      slots: occasions.map((occasion) => ({
        date,
        occasion,
        fit: "none" as const,
        combination_id: null,
        item_ids: [],
        note: null,
      })),
    };
  });
  if (assumed.length) {
    notes.push(`No plans were given for ${assumed.join(", ")}; an easy errands outfit was assumed.`);
  }
  if (estimatedDays.length) {
    notes.push(
      `The forecast only reaches five days out; ${estimatedDays.length} day${estimatedDays.length > 1 ? "s use" : " uses"} an estimated ${Math.round(input.expected_temp_c!)}°C${input.expected_rain ? " with rain likely" : ""}.`,
    );
  }
  if (unknownDays.length) {
    notes.push(
      `No forecast or estimate for ${unknownDays.join(", ")}; those days were planned without a weather filter.`,
    );
  }

  // The table and the wardrobe
  const [{ data: comboData }, { data: itemData }] = await Promise.all([
    supabase
      .from("combinations")
      .select("*")
      .eq("user_id", userId)
      .eq("hidden", false)
      .order("overall_score", { ascending: false })
      .limit(1000),
    supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .eq("ai_status", "confirmed"),
  ]);
  const combinations = (comboData ?? []) as Combination[];
  const items = (itemData ?? []) as ClothingItem[];
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const slots: PackSlot[] = days.flatMap((day) =>
    day.slots.map((s, i) => ({
      key: `${day.date}#${s.occasion}#${i}`,
      date: day.date,
      occasion: s.occasion,
      weather: {
        tempC: day.weather.tempC,
        rainy: (day.weather.precipProb ?? 0) > 40,
      },
      requireItemIds: byDate.get(day.date)?.require_item_ids ?? null,
    })),
  );

  const c = input.constraints;
  const result = planPacking(combinations, itemsById, slots, {
    maxShoes: c?.max_shoes ?? null,
    maxOuterwear: c?.max_outerwear ?? null,
    travelLight: c?.travel_light ?? null,
    excludeItemIds: c?.exclude_item_ids ?? null,
    requireItemIds: c?.require_item_ids ?? null,
  });
  notes.push(...result.notes);

  // Fill the slots back in.
  const packedByKey = new Map(result.slots.map((s) => [s.key, s]));
  for (const day of days) {
    day.slots = day.slots.map((s, i) => {
      const packed = packedByKey.get(`${day.date}#${s.occasion}#${i}`);
      return {
        ...s,
        fit: packed?.fit ?? "none",
        combination_id: packed?.combination?.id ?? null,
        item_ids: packed?.itemIds ?? [],
        note: packed?.combination?.notes ?? null,
      };
    });
  }

  const summaries: Record<string, TripItemSummary> = {};
  for (const id of result.uses.keys()) {
    const item = itemsById.get(id);
    if (!item) continue;
    summaries[id] = {
      id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      color_hex: item.color_hex,
      color_name: item.color_name,
    };
  }
  const packing = [...result.uses.entries()]
    .map(([item_id, uses]) => ({ item_id, uses }))
    .sort(
      (a, b) =>
        (CATEGORY_ORDER.get(summaries[a.item_id]?.category) ?? 99) -
          (CATEGORY_ORDER.get(summaries[b.item_id]?.category) ?? 99) ||
        b.uses - a.uses ||
        (summaries[a.item_id]?.name ?? "").localeCompare(summaries[b.item_id]?.name ?? ""),
    );

  const filled = result.slots.filter((s) => s.combination);
  const distinctOutfits = new Set(filled.map((s) => s.combination!.id)).size;
  const count = (category: string) =>
    packing.filter((p) => summaries[p.item_id]?.category === category).length;
  const appearances = filled.reduce((n, s) => n + s.itemIds.length, 0);

  const plan: TripPlan = {
    destination: input.destination,
    location_name: locationName,
    start_date: dates[0],
    end_date: dates[dates.length - 1],
    days,
    packing,
    items: summaries,
    stats: {
      distinct_items: packing.length,
      outfits: distinctOutfits,
      slots_total: slots.length,
      slots_filled: filled.length,
      reuse_ratio: packing.length ? appearances / packing.length : 0,
      shoes: count("shoes"),
      outerwear: count("outerwear"),
      watches: count("watch"),
    },
    notes,
  };
  return { ok: true, plan };
}

function summarize(item: ClothingItem): TripItemSummary {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color_hex: item.color_hex,
    color_name: item.color_name,
  };
}

/**
 * The find_outfits tool: the table's best outfits for one occasion, built
 * around the pieces the client named, optionally filtered by the forecast
 * at a place and date. No AI in here; the stylist narrates what comes back.
 */
export async function findOutfits(
  supabase: SupabaseClient,
  userId: string,
  input: FindOutfitsInput,
): Promise<FindOutfitsResult> {
  const notes: string[] = [];
  const limit = input.limit ?? 5;

  const [{ data: comboData }, { data: itemData }, { data: profile }] = await Promise.all([
    supabase
      .from("combinations")
      .select("*")
      .eq("user_id", userId)
      .eq("hidden", false)
      .order("overall_score", { ascending: false })
      .limit(1000),
    supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .eq("ai_status", "confirmed"),
    supabase
      .from("profiles")
      .select("home_location, home_lat, home_lon")
      .eq("id", userId)
      .single(),
  ]);
  const itemsById = new Map(((itemData ?? []) as ClothingItem[]).map((i) => [i.id, i]));

  const required = (input.require_item_ids ?? []).filter((id) => itemsById.has(id));
  const unknown = (input.require_item_ids ?? []).filter((id) => !itemsById.has(id));
  if (unknown.length) {
    return {
      ok: false,
      reason: `${unknown.join(", ")} ${unknown.length > 1 ? "are not ids" : "is not an id"} from the wardrobe list. Match the client's words to the list and pass those ids.`,
    };
  }
  const excluded = new Set(input.exclude_item_ids ?? []);

  // Weather, when a place or date is given.
  let weather: OutfitWeather = {
    source: "unknown",
    tempC: null,
    tempMinC: null,
    tempMaxC: null,
    precipProb: null,
    condition: null,
    location_name: null,
    date: input.date && isIsoDate(input.date) ? input.date : null,
  };
  if (weather.date) {
    try {
      let lat = profile?.home_lat ?? null;
      let lon = profile?.home_lon ?? null;
      let locationName = profile?.home_location ?? null;
      if (input.destination) {
        const geo = await geocode(input.destination);
        if (!geo) {
          return {
            ok: false,
            reason: `"${input.destination}" did not match any place. Ask for the city and country, then call again.`,
          };
        }
        lat = geo.lat;
        lon = geo.lon;
        locationName = locationLabel(geo);
      }
      if (lat != null && lon != null) {
        const forecast = await getTripForecast(lat, lon, locationName ?? "there");
        const snap = forecast[weather.date];
        if (snap) {
          weather = {
            source: "forecast",
            tempC: snap.tempC,
            tempMinC: snap.tempMinC,
            tempMaxC: snap.tempMaxC,
            precipProb: snap.precipProb,
            condition: snap.condition,
            location_name: locationName,
            date: weather.date,
          };
        } else {
          weather.location_name = locationName;
          notes.push(`The forecast does not reach ${weather.date} yet; outfits were not filtered by weather.`);
        }
      }
    } catch (err) {
      console.error("find_outfits weather failed:", err);
      notes.push("The weather service did not answer; outfits were not filtered by weather.");
    }
  }

  const bands = weather.tempC == null ? null : new Set(tempToSeasonBands(weather.tempC));
  const rainy = (weather.precipProb ?? 0) > 40;

  const pool = ((comboData ?? []) as Combination[])
    .map((combo) => ({ combo, itemIds: combinationItemIds(combo) }))
    .filter(({ combo, itemIds }) => {
      if (itemIds.some((id) => !itemsById.has(id) || excluded.has(id))) return false;
      if (!required.every((id) => itemIds.includes(id))) return false;
      if (bands && !combo.season_suitability.some((s) => bands.has(s))) return false;
      if (rainy) {
        const m = itemsById.get(combo.shoes_id)?.material;
        if (m === "suede" || m === "canvas") return false;
      }
      return true;
    });

  if (pool.length === 0) {
    if (required.length) {
      const names = required.map((id) => itemsById.get(id)!.name).join(" and ");
      const anywhere = ((comboData ?? []) as Combination[]).some((c) =>
        required.every((id) => combinationItemIds(c).includes(id)),
      );
      notes.push(
        anywhere
          ? `${names} ${required.length > 1 ? "appear" : "appears"} together in the table, but no such outfit suits this weather.`
          : `${names} ${required.length > 1 ? "do" : "does"} not share any outfit in the table; the pieces have not been scored as a match.`,
      );
    } else {
      notes.push("No visible outfit in the table passes this weather and occasion.");
    }
  }

  const score = (c: Combination) => occasionScore(c, input.occasion);
  const ranked = pool
    .slice()
    .sort(
      (a, b) =>
        Number(b.combo.boosted) - Number(a.combo.boosted) ||
        score(b.combo) - score(a.combo) ||
        b.combo.overall_score - a.combo.overall_score,
    );
  let picked = ranked.filter(({ combo }) => score(combo) >= RECO_MIN_OCCASION_SCORE);
  let fit: OutfitOption["fit"] = "good";
  if (picked.length === 0) {
    picked = ranked.filter(({ combo }) => score(combo) >= RECO_RELAXED_SCORE);
    fit = "relaxed";
  }
  if (picked.length === 0) {
    picked = ranked;
    fit = "relaxed";
  }
  picked = picked.slice(0, limit);
  if (fit === "relaxed" && picked.length) {
    notes.push(`Nothing containing these pieces reaches the usual ${input.occasion} floor; the closest looks are shown.`);
  }

  const items: Record<string, TripItemSummary> = {};
  for (const { itemIds } of picked) for (const id of itemIds) items[id] = summarize(itemsById.get(id)!);
  for (const id of required) items[id] = summarize(itemsById.get(id)!);

  return {
    ok: true,
    options: {
      occasion: input.occasion,
      weather,
      outfits: picked.map(({ combo, itemIds }) => ({
        combination_id: combo.id,
        item_ids: itemIds,
        overall_score: combo.overall_score,
        occasion_score: score(combo),
        old_money_score: combo.old_money_score,
        boosted: combo.boosted,
        fit,
        note: combo.notes,
      })),
      items,
      built_around: required,
      notes,
    },
  };
}
