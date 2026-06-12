import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { rerankSchema, type RerankResult } from "@/lib/schemas";
import { describeItem } from "@/lib/ai/describe";
import { withRetry } from "@/lib/ai/retry";
import type {
  ClothingItem,
  Combination,
  WeatherSnapshot,
} from "@/types/database";

export async function rerankAndExplain({
  candidates,
  itemsById,
  weather,
  occasion,
  notes,
  stylePreferences,
}: {
  candidates: Combination[];
  itemsById: Map<string, ClothingItem>;
  weather: WeatherSnapshot;
  occasion: string;
  notes?: string | null;
  stylePreferences: string[];
}): Promise<RerankResult> {
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
    for (const accId of c.accessory_ids) {
      const item = itemsById.get(accId);
      if (item) lines.push(`  accessory: ${describeItem(item)}`);
    }
    return [
      `id: ${c.id}`,
      ...lines,
      `  stylist note: ${c.notes ?? "—"}`,
      `  scores: overall ${c.overall_score}, work ${c.work_score}, daily ${c.daily_score}, old-money ${c.old_money_score}`,
    ].join("\n");
  };

  const { object } = await withRetry(() =>
    generateObject({
      model: openai("gpt-4o-mini"),
      schema: rerankSchema,
      messages: [
        {
          role: "system",
          content: `You are the client's trusted personal stylist choosing today's outfit.
Pick the best 3-5 combinations for the day, ranked 1 (best) first.

Consider:
- The weather: dress for comfort first (layers when cold, breathable when hot,
  sensible shoes when rain is likely).
- The occasion and the client's own words about their plans.
- Their preferred styles: ${stylePreferences.join(", ") || "smart casual"}.
- Variety is a virtue, but never at the cost of appropriateness.

For each pick, write exactly two warm, concrete sentences explaining WHY —
mention the weather and their plans naturally, like a stylist laying clothes
on the bed. Use the combination ids verbatim.`,
        },
        {
          role: "user",
          content: `Today: ${occasion}${notes ? ` — "${notes}"` : ""}
Weather at destination (${weather.locationName}): ${weather.summary}, feels like ${weather.feelsLikeC}°C, humidity ${weather.humidity}%.

Candidate combinations:

${candidates.map(describeCombo).join("\n\n")}`,
        },
      ],
    }),
  );

  return object;
}
