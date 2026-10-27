import { z } from "zod";
import { OCCASIONS, type Occasion } from "@/lib/constants";
import type { Category } from "@/types/database";

/* ---------- Tool input: what the stylist asks the planner for ---------- */

const occasionValues = OCCASIONS.map((o) => o.value) as [Occasion, ...Occasion[]];

export const tripDaySchema = z.object({
  date: z.string().describe("Calendar day, YYYY-MM-DD"),
  occasions: z
    .array(z.enum(occasionValues))
    .min(1)
    .max(3)
    .describe(
      "What the client does that day, in order, one outfit per entry. Use 'travel' for flight days, 'work' or 'indoors' for conferences, 'dinner' or 'going_out' for evenings, 'mall' or 'park' for sightseeing.",
    ),
  notes: z
    .string()
    .nullable()
    .describe("The client's own words about that day, if any"),
  require_item_ids: z
    .array(z.string())
    .nullable()
    .describe(
      "Wardrobe item ids the client wants to wear THAT day (ids verbatim from the wardrobe list). Every outfit for the day is built around them when the table allows.",
    ),
});

export const tripConstraintsSchema = z.object({
  max_shoes: z
    .number()
    .int()
    .min(1)
    .max(6)
    .nullable()
    .describe("Most pairs of shoes to pack; null for no limit"),
  max_outerwear: z
    .number()
    .int()
    .min(0)
    .max(4)
    .nullable()
    .describe("Most outerwear pieces to pack; null for no limit"),
  travel_light: z
    .boolean()
    .nullable()
    .describe("True when the client wants a carry-on or the fewest pieces possible"),
  exclude_item_ids: z
    .array(z.string())
    .nullable()
    .describe("Wardrobe item ids the client does not want to pack (ids verbatim from the wardrobe list)"),
  require_item_ids: z
    .array(z.string())
    .nullable()
    .describe("Wardrobe item ids the client insists on packing (ids verbatim from the wardrobe list)"),
});

export const planTripInputSchema = z.object({
  destination: z
    .string()
    .describe("City the trip happens in, e.g. 'Lisbon, Portugal'"),
  start_date: z.string().describe("First day of the trip, YYYY-MM-DD"),
  end_date: z.string().describe("Last day of the trip, YYYY-MM-DD (inclusive)"),
  days: z
    .array(tripDaySchema)
    .min(1)
    .describe("One entry per trip day, covering every date from start to end"),
  expected_temp_c: z
    .number()
    .nullable()
    .describe(
      "Typical daytime temperature in °C for days beyond the forecast window: your best estimate of the destination's climate on those dates. Null when the whole trip is within the next five days.",
    ),
  expected_rain: z
    .boolean()
    .nullable()
    .describe("Whether rain is likely on days beyond the forecast window"),
  constraints: tripConstraintsSchema.nullable(),
});

export type PlanTripInput = z.infer<typeof planTripInputSchema>;
export type TripConstraints = z.infer<typeof tripConstraintsSchema>;

/* ---------- Tool output: what the UI card and the stylist receive ---------- */

export type WeatherSource = "forecast" | "estimate" | "unknown";

export interface TripItemSummary {
  id: string;
  name: string;
  category: Category;
  subcategory: string | null;
  color_hex: string | null;
  color_name: string | null;
}

export interface TripSlotPlan {
  date: string;
  occasion: Occasion;
  /** 'relaxed' = the usual score floor was lowered to find anything at all. */
  fit: "good" | "relaxed" | "none";
  combination_id: string | null;
  item_ids: string[];
  /** The scored combination's one-sentence stylist note, when it has one. */
  note: string | null;
}

export interface TripDayPlan {
  date: string;
  weather: {
    source: WeatherSource;
    tempC: number | null;
    tempMinC: number | null;
    tempMaxC: number | null;
    precipProb: number | null;
    condition: string | null;
  };
  slots: TripSlotPlan[];
}

export interface TripPackingEntry {
  item_id: string;
  /** Number of outfits across the trip this piece appears in. */
  uses: number;
}

export interface TripPlan {
  destination: string;
  location_name: string;
  start_date: string;
  end_date: string;
  days: TripDayPlan[];
  packing: TripPackingEntry[];
  items: Record<string, TripItemSummary>;
  stats: {
    distinct_items: number;
    outfits: number;
    slots_total: number;
    slots_filled: number;
    /** Outfit-appearances per packed piece; higher means more reuse. */
    reuse_ratio: number;
    shoes: number;
    outerwear: number;
    watches: number;
  };
  /** Honest caveats for the client: estimates, gaps, relaxed constraints. */
  notes: string[];
}

/**
 * What plan_trip hands back. A failure is a normal result, not an exception,
 * so the stylist can ask for what is missing instead of the chat breaking.
 */
export type PlanTripResult =
  | { ok: true; plan: TripPlan }
  | { ok: false; reason: string };

/** Reminder appended to every tool result: small models follow it best when it sits next to the data. */
const NARRATION_RULE =
  "The client is already looking at this as a card. Do NOT list the days, outfits or packing list again. Reply in plain prose, three to six sentences, no headings, bullets or bold: which pieces carry the plan, the weather caveat if any, anything that could not be done and why, and one tweak to offer.";

export function describeTripPlanResultForModel(result: PlanTripResult): string {
  if (!result.ok) return `plan_trip could not run: ${result.reason}`;
  return `${describeTripPlanForModel(result.plan)}\n\n${NARRATION_RULE}`;
}

/** Compact text for the model: the card already shows the client the detail. */
export function describeTripPlanForModel(plan: TripPlan): string {
  const name = (id: string) => plan.items[id]?.name ?? id;
  const lines: string[] = [
    `Trip to ${plan.location_name}, ${plan.start_date} to ${plan.end_date}.`,
    `Pack ${plan.stats.distinct_items} pieces for ${plan.stats.slots_filled}/${plan.stats.slots_total} outfits (${plan.stats.outfits} distinct); reuse ${plan.stats.reuse_ratio.toFixed(1)} wears per piece; ${plan.stats.shoes} shoes, ${plan.stats.outerwear} outerwear, ${plan.stats.watches} watches.`,
    "",
    "Day by day:",
  ];
  for (const day of plan.days) {
    const w = day.weather;
    const weather =
      w.tempC == null
        ? "weather unknown"
        : `${Math.round(w.tempC)}°C${w.precipProb != null ? `, ${w.precipProb}% rain` : ""}${w.source === "estimate" ? " (estimate)" : ""}`;
    lines.push(`${day.date} (${weather}):`);
    for (const s of day.slots) {
      const outfit =
        s.combination_id == null
          ? "no suitable outfit in the table"
          : s.item_ids.map(name).join(" + ") + (s.fit === "relaxed" ? " [loose fit]" : "");
      lines.push(`  ${s.occasion}: ${outfit}`);
    }
  }
  lines.push("", "Packing list (uses):");
  for (const p of plan.packing) {
    const item = plan.items[p.item_id];
    lines.push(`  ${item?.category ?? "?"}: ${name(p.item_id)} [${p.item_id}] ×${p.uses}`);
  }
  if (plan.notes.length) lines.push("", "Caveats:", ...plan.notes.map((n) => `  - ${n}`));
  return lines.join("\n");
}

/* ---------- find_outfits: one occasion, built around the client's pieces ---------- */

export const findOutfitsInputSchema = z.object({
  occasion: z.enum(occasionValues).describe("What the outfit is for"),
  require_item_ids: z
    .array(z.string())
    .nullable()
    .describe("Wardrobe item ids every outfit must include (ids verbatim from the wardrobe list)"),
  exclude_item_ids: z
    .array(z.string())
    .nullable()
    .describe("Wardrobe item ids no outfit may include"),
  destination: z
    .string()
    .nullable()
    .describe("Where the client will be, for the forecast; null for home"),
  date: z
    .string()
    .nullable()
    .describe("The day, YYYY-MM-DD, for the forecast; null for no weather filter"),
  limit: z.number().int().min(1).max(8).nullable().describe("How many outfits to return; default 5"),
});

export type FindOutfitsInput = z.infer<typeof findOutfitsInputSchema>;

export interface OutfitOption {
  combination_id: string;
  item_ids: string[];
  overall_score: number;
  /** The table's blend for the requested occasion, 0–10. */
  occasion_score: number;
  old_money_score: number | null;
  boosted: boolean;
  /** 'relaxed' = below the usual occasion floor; nothing stronger contained the pieces. */
  fit: "good" | "relaxed";
  note: string | null;
}

export type OutfitWeather = TripDayPlan["weather"] & {
  location_name: string | null;
  date: string | null;
};

export interface OutfitOptions {
  occasion: Occasion;
  weather: OutfitWeather;
  outfits: OutfitOption[];
  items: Record<string, TripItemSummary>;
  /** Pieces that were asked for and are in every outfit shown. */
  built_around: string[];
  notes: string[];
}

export type FindOutfitsResult =
  | { ok: true; options: OutfitOptions }
  | { ok: false; reason: string };

export function describeFindOutfitsResultForModel(result: FindOutfitsResult): string {
  if (!result.ok) return `find_outfits could not run: ${result.reason}`;
  const o = result.options;
  const name = (id: string) => o.items[id]?.name ?? id;
  const w = o.weather;
  const lines: string[] = [
    `Outfits for ${o.occasion}${w.location_name ? ` in ${w.location_name}` : ""}${w.date ? ` on ${w.date}` : ""}${
      w.tempC != null ? ` (${Math.round(w.tempC)}°C${w.precipProb != null ? `, ${w.precipProb}% rain` : ""})` : ""
    }:`,
  ];
  if (o.built_around.length) lines.push(`Built around: ${o.built_around.map(name).join(", ")}.`);
  o.outfits.forEach((f, i) => {
    lines.push(
      `${i + 1}. ${f.item_ids.map(name).join(" + ")} — occasion ${f.occasion_score.toFixed(1)}, overall ${f.overall_score.toFixed(1)}${
        f.old_money_score != null ? `, old-money ${f.old_money_score}` : ""
      }${f.boosted ? ", boosted" : ""}${f.fit === "relaxed" ? " [loose fit]" : ""}${f.note ? `. Note: ${f.note}` : ""}`,
    );
  });
  if (o.outfits.length === 0) lines.push("  (none)");
  if (o.notes.length) lines.push("Caveats:", ...o.notes.map((n) => `  - ${n}`));
  lines.push(
    "",
    "The client is already looking at these outfits as a card. Do NOT list them again. Reply in plain prose, no headings, bullets or bold: for the top one or two, why the pieces work together and what you would swap; name the client's own pieces that are doing the work.",
  );
  return lines.join("\n");
}
