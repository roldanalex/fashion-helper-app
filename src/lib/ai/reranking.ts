import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { rerankSchema, type RerankResult } from "@/lib/schemas";
import { describeItem } from "@/lib/ai/describe";
import { withRetry } from "@/lib/ai/retry";
import { PERSONAL_FIT_RULE } from "@/lib/personal/client-profile";
import type { PromptSubject } from "@/lib/people/subject";
import {
  MAX_DAILY_ACCESSORIES,
  OCCASION_HINTS,
  RECO_MAX_PICKS,
  RECO_MIN_PICKS,
  type Occasion,
} from "@/lib/constants";
import type {
  ClothingItem,
  Combination,
  WeatherSnapshot,
} from "@/types/database";

export async function rerankAndExplain({
  candidates,
  itemsById,
  watchPool,
  accessoryPool,
  weather,
  occasion,
  notes,
  subject,
  languageRule = "",
}: {
  candidates: Combination[];
  itemsById: Map<string, ClothingItem>;
  /** Every confirmed watch the client owns; the stylist picks today's. */
  watchPool: ClothingItem[];
  /** Every confirmed accessory the client owns; the stylist picks today's. */
  accessoryPool: ClothingItem[];
  weather: WeatherSnapshot;
  occasion: Occasion;
  notes?: string | null;
  /** Who the outfits are for: the prompt-safe view only (docs/adr/0002). */
  subject: PromptSubject;
  /** aiLanguageRule(locale) */
  languageRule?: string;
}): Promise<RerankResult> {
  const personal = subject.personalBlock;
  const describeCombo = (c: Combination) => {
    const slots: [string, string | null][] = [
      ["top", c.top_id],
      ["bottom", c.bottom_id],
      ["shoes", c.shoes_id],
      ["outerwear", c.outerwear_id],
    ];
    const lines = slots
      .filter(([, id]) => id)
      .map(([slot, id]) => {
        const item = itemsById.get(id!);
        return `  ${slot}: ${item ? describeItem(item) : "unknown"}`;
      });
    const defaults = c.accessory_ids
      .map((id) => itemsById.get(id)?.name)
      .filter(Boolean)
      .join(", ");
    const defaultWatch = c.watch_id ? itemsById.get(c.watch_id)?.name : null;
    return [
      `id: ${c.id}`,
      ...lines,
      `  default watch: ${defaultWatch ?? "none"}`,
      `  default accessories: ${defaults || "none"}`,
      `  stylist note: ${c.notes ?? "—"}`,
      `  scores: overall ${c.overall_score}, work ${c.work_score}, daily ${c.daily_score}, old-money ${c.old_money_score}`,
    ].join("\n");
  };

  const watchLines = watchPool
    .map((w) => `  ${w.id} — ${describeItem(w)}`)
    .join("\n");

  const accessoryLines = accessoryPool
    .map((a) => `  ${a.id} — ${a.subcategory ?? "accessory"}: ${describeItem(a)}`)
    .join("\n");

  const { object } = await withRetry(() =>
    generateObject({
      model: openai("gpt-4o-mini"),
      schema: rerankSchema,
      messages: [
        {
          role: "system",
          content: `You are the client's trusted personal stylist choosing today's outfit.
Pick the best ${RECO_MIN_PICKS}-${RECO_MAX_PICKS} combinations for the day, ranked 1 (best) first.

Consider:
- The weather: dress for comfort first (layers when cold, breathable when hot,
  sensible shoes when rain is likely).
- The occasion and the client's own words about their plans.
- ${subject.styleLine}${subject.audienceGuide ? `
- ${subject.audienceGuide}` : ""}
- Variety is a virtue, but never at the cost of appropriateness.
${personal ? `- The client themselves (below): among outfits that suit the day equally, prefer
  colours near the face that flatter them and cuts that suit their build.

${personal}
${PERSONAL_FIT_RULE}
` : ""}
Watch: for each pick, choose today's watch from the watch pool (watch_id
verbatim, or null if the pool is empty). You may keep the outfit's default or
swap it. Match the watch to the day: a GMT or sports watch for travel and
active days, a dressier watch for work, dinner and events.

Accessories: choose today's accessories from the accessory pool (up to
${MAX_DAILY_ACCESSORIES}, at most one per type, ids verbatim). Keep metals
consistent with the watch (silver watch with a silver buckle); sunglasses only
when the day is bright and outdoors. If the pool is empty, return [].

For each pick, write exactly two warm, concrete sentences explaining WHY —
mention the weather, their plans and the watch or key accessory naturally, like
a stylist laying clothes on the bed. Use the combination ids verbatim.${languageRule ? `\n${languageRule}` : ""}`,
        },
        {
          role: "user",
          content: `Today: ${occasion}${notes ? ` — "${notes}"` : ""}
Occasion notes: ${OCCASION_HINTS[occasion]}
Weather at destination${subject.isMinor ? "" : ` (${weather.locationName})`}: ${weather.summary}, feels like ${weather.feelsLikeC}°C, humidity ${weather.humidity}%.

Watch pool:
${watchLines || "  (none)"}

Accessory pool:
${accessoryLines || "  (none)"}

Candidate combinations:

${candidates.map(describeCombo).join("\n\n")}`,
        },
      ],
    }),
  );

  return object;
}
