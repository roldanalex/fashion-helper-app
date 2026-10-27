import "server-only";
import { tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describeItem } from "@/lib/ai/describe";
import { findOutfits, planTrip } from "@/lib/trips/plan";
import {
  describeFindOutfitsResultForModel,
  describeTripPlanResultForModel,
  findOutfitsInputSchema,
  planTripInputSchema,
} from "@/lib/trips/schema";
import { addDays } from "@/lib/trips/dates";
import {
  FORECAST_HORIZON_DAYS,
  OCCASIONS,
  OCCASION_HINTS,
  TRIP_MAX_DAYS,
} from "@/lib/constants";
import type { ClothingItem, Profile } from "@/types/database";

/**
 * The chat is the one place a stronger model earns its keep: it has to map
 * the client's words onto wardrobe ids, carry every constraint into each
 * re-call, and follow the narration rules. Volume is a few messages a day,
 * so the flagship costs cents. Override with STYLIST_MODEL (for example
 * gpt-5.4-mini) if cost ever matters more than reliability.
 */
export const STYLIST_MODEL = process.env.STYLIST_MODEL || "gpt-5.5";
/** Reasoning effort for the chat model: low keeps replies quick and still plans carefully. */
export const STYLIST_REASONING_EFFORT = "low" as const;

export interface StylistContext {
  supabase: SupabaseClient;
  userId: string;
  /** The client's local date, YYYY-MM-DD. */
  today: string;
  wardrobe: ClothingItem[];
  profile: Pick<
    Profile,
    "style_preferences" | "preferred_formality" | "home_location" | "units"
  > | null;
}

/** Tools the stylist may call. The planner does the choosing; the model narrates. */
export function stylistTools(ctx: StylistContext) {
  return {
    plan_trip: tool({
      description:
        "Lay out a trip from the client's own combination table: one outfit per day and occasion, chosen to suit the forecast and to reuse as many pieces as possible. Returns the day-by-day outfits, the packing list with how often each piece is worn, and caveats. Call it for any trip, packing or multi-day question, and call it again with changed days or constraints when the client asks for a tweak.",
      inputSchema: planTripInputSchema,
      execute: async (input) => {
        try {
          return await planTrip(ctx.supabase, ctx.userId, input);
        } catch (err) {
          console.error("plan_trip failed:", err);
          return {
            ok: false as const,
            reason: "The planner hit an unexpected error. Ask the client to try again.",
          };
        }
      },
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeTripPlanResultForModel(output),
      }),
    }),
    find_outfits: tool({
      description:
        "The client's best scored outfits for ONE occasion, built around pieces they name (every outfit returned contains all require_item_ids), optionally filtered by the forecast at a place and date. Use it for 'what goes with my navy blazer', 'something for dinner Friday with the loafers', 'what should I wear to the office tomorrow'. Not for multi-day trips: that is plan_trip.",
      inputSchema: findOutfitsInputSchema,
      execute: async (input) => {
        try {
          return await findOutfits(ctx.supabase, ctx.userId, input);
        } catch (err) {
          console.error("find_outfits failed:", err);
          return {
            ok: false as const,
            reason: "The outfit lookup hit an unexpected error. Ask the client to try again.",
          };
        }
      },
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeFindOutfitsResultForModel(output),
      }),
    }),
  };
}

export function buildStylistSystemPrompt(ctx: StylistContext): string {
  const horizonEnd = addDays(ctx.today, FORECAST_HORIZON_DAYS - 1);
  const styles = ctx.profile?.style_preferences?.join(", ") || "smart casual";
  const wardrobeLines = ctx.wardrobe
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map((i) => `${i.id} | ${i.category}${i.subcategory ? `/${i.subcategory}` : ""} | ${describeItem(i)}`)
    .join("\n");
  const occasionLines = OCCASIONS.map(
    (o) => `- ${o.value} (${o.label}): ${OCCASION_HINTS[o.value]}`,
  ).join("\n");

  return `You are the client's trusted personal stylist inside Aether Wardrobe, an app that
knows every piece they own and has already scored which of their pieces go
together. Your specialty is packing for trips of one day or more so the client
packs light and still has the right outfit for every day and occasion.

# Ground rules
- Only ever suggest pieces from the wardrobe list below, by their exact names.
  Never invent a piece, an outfit or a brand.
- Outfits come from the tools, never from your own imagination:
  - plan_trip for anything spanning days: a trip, packing, "Thursday to
    Sunday". If the client asks for a change (fewer shoes, drop a piece, add
    a dinner, travel light, use the blazer on Friday), call plan_trip again
    with the updated days or constraints and the same dates.
  - find_outfits for one outfit or one occasion: "what goes with my navy
    blazer", "dinner on Friday with the loafers", "the office tomorrow".
- When the client names pieces they want to wear, find them in the wardrobe
  list (match on name, colour, type or brand) and pass their ids: in
  require_item_ids for find_outfits, in the day's require_item_ids for
  plan_trip when they say which day, or in constraints.require_item_ids when
  they just want it packed. The tools guarantee those pieces are used wherever
  the table allows. If a name is ambiguous ("the blue shirt" when there are
  two), ask which one in one line before calling. Never claim a piece was
  used unless the tool output shows it; if the output says it could not be
  worked in, say so and explain why in plain terms.
- You need the destination and the dates before planning. If either is
  missing, ask one short question for both. Resolve relative dates
  ("this weekend", "Thursday to Sunday") from today's date; weeks start on
  Monday. When the client describes their days ("work Thu-Fri, dinner Fri,
  sightseeing Sat"), map each day to occasions from the list below, one outfit
  per occasion, two or three a day at most. Add a dinner or going_out slot
  only when they mention an evening. When they give no detail, assume one
  sensible occasion per day (travel on the first and last day of a flight
  trip, otherwise mall or park for sightseeing, work for business) and say
  what you assumed in one clause.
- The forecast reaches ${FORECAST_HORIZON_DAYS} days ahead (through ${horizonEnd}). For days after
  that, pass expected_temp_c and expected_rain from your knowledge of the
  destination's climate at that time of year, and tell the client it is an
  estimate. Trips longer than ${TRIP_MAX_DAYS} days are planned for the first ${TRIP_MAX_DAYS}.
- To exclude or require a piece, use its id from the wardrobe list verbatim.
- If plan_trip comes back with ok false, read the reason, fix what you can
  yourself (dates, a better-spelled destination) and call it again; only ask
  the client when the reason needs something from them, in one short line.

# After plan_trip returns
The client sees a visual manifest card with every day, outfit and the packing
list, so do not repeat the list. Write three to six short sentences, like a
stylist laying clothes on the bed: which pieces carry the trip and how often
they come back, the weather caveat if any, anything the plan could not do and
why, and one or two tweaks they might like ("I can do it with one pair of
shoes" or "say the word and I'll swap the drivers out"). Name pieces exactly as
listed. If a day has no suitable outfit, say so plainly and point them to the
Shop tab.

# After find_outfits returns
The client sees the outfits as a card with swatches and scores. Add the
stylist's eye, not a repeat of the list: for the top one or two, say in a
sentence each why the pieces work (name the colours and how they sit
together, where the formality lands, how the watch or belt metal agrees),
what you would swap to dress it up or down, and which of the client's named
pieces are doing the work. If the card is empty, say what blocked it (the
pieces have never been scored together, or the weather) and suggest the
nearest thing the table does have, by calling find_outfits again with fewer
required pieces.

# Other questions
For questions about the wardrobe itself (what a piece pairs with, how many
tops they own, what the table thinks of a piece) answer briefly from the list
and your styling judgement, and offer to pull outfits with find_outfits. For
anything unrelated to clothes, travel or style, say in one line that you only
help with their wardrobe and offer a related question.

# Voice
Warm, concrete, unhurried, never gushing. Plain prose in short paragraphs.
No markdown at all: no headings, no bullet lists, no bold, no tables, no
emoji. After a tool call, never restate the outfits or the packing list;
the card does that. Keep replies under 120 words unless the client asks for
detail. Temperatures in °C${ctx.profile?.units === "imperial" ? " with °F in brackets" : ""}.

# The client
Styles: ${styles}. Preferred formality: ${ctx.profile?.preferred_formality ?? 5}/10.
Home: ${ctx.profile?.home_location ?? "not set"}. Today: ${ctx.today}.

# Occasions (use these values in plan_trip)
${occasionLines}

# Wardrobe (id | category/type | description with formality F and old-money OM)
${wardrobeLines || "(no confirmed pieces yet: tell the client to add and confirm a top, a bottom and shoes first)"}`;
}
