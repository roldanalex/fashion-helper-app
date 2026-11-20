import "server-only";
import { PERSONAL_FIT_RULE, seasonOf } from "@/lib/personal/client-profile";
import { tool } from "ai";
import type { Wardrobe } from "@/lib/wardrobe";
import type { PersonContext, AccountProfile } from "@/lib/people/context";
import { occasionsFor } from "@/lib/constants";
import { aiLanguageRule } from "@/i18n/config";
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
  OCCASION_HINTS,
  TRIP_MAX_DAYS,
} from "@/lib/constants";
import type { ClothingItem } from "@/types/database";

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
  /** The Active person's Wardrobe; tools read only from it. */
  wardrobe: Wardrobe;
  /** The client's local date, YYYY-MM-DD. */
  today: string;
  /** Confirmed pieces, listed in the prompt by id. */
  pieces: ClothingItem[];
  person: PersonContext;
  /** The Family's home and temperature unit. */
  account: AccountProfile | null;
  /** The language on screen; replies come back in it. */
  locale: string;
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
          return await planTrip(ctx.wardrobe, input, {
            colorSeason: seasonOf(ctx.person.personal),
            locale: ctx.locale,
          });
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
          return await findOutfits(ctx.wardrobe, input, {
            colorSeason: seasonOf(ctx.person.personal),
            locale: ctx.locale,
            home: ctx.account,
          });
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
  // Only the prompt-safe view of the Person (docs/adr/0002).
  const subject = ctx.person.subject;
  const personalBlock = subject.personalBlock;
  const horizonEnd = addDays(ctx.today, FORECAST_HORIZON_DAYS - 1);
  const wardrobeLines = ctx.pieces
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map((i) => `${i.id} | ${i.category}${i.subcategory ? `/${i.subcategory}` : ""} | ${describeItem(i)}`)
    .join("\n");
  const occasionLines = occasionsFor(subject.isMinor).map(
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
detail. ${ctx.account?.units === "imperial" ? "The client reads temperatures in °F: tool results and the forecast are in °C, so convert before you mention a number, and never show °C." : "Temperatures in °C."}

# The client
${subject.isMinor ? `You are dressing a family member the parent calls "${subject.alias}". ${subject.audienceGuide} Speak to the parent; refer to the child only as "${subject.alias}", never guess their name, age or looks, and do not ask for them.
` : ""}${subject.styleLine}
${subject.isMinor ? "" : `Home: ${ctx.account?.home_location ?? "not set"}. `}Today: ${ctx.today}.
${personalBlock ? `${personalBlock}
${PERSONAL_FIT_RULE} The tools already favour flattering near-face colours; when you explain a pick, you may say why its colours or cut suit the client.` : "The client has not shared their build or colouring; do not ask unless they bring it up."}

${aiLanguageRule(ctx.locale) ? `# Language\n${aiLanguageRule(ctx.locale)} Tool inputs (ids, dates, occasion values) stay in English.\n\n` : ""}# Occasions (use these values in plan_trip)
${occasionLines}

# Wardrobe (id | category/type | description with formality F and old-money OM)
${wardrobeLines || "(no confirmed pieces yet: tell the client to add and confirm a top, a bottom and shoes first)"}`;
}
