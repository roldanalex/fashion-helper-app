import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { shoppingSchema, type ShoppingResult } from "@/lib/schemas";
import { describeItem } from "@/lib/ai/describe";
import { withRetry } from "@/lib/ai/retry";
import type { CategoryGap } from "@/lib/gap-analysis";
import type { ClothingItem } from "@/types/database";

export async function suggestPurchases({
  wardrobe,
  gaps,
  selectedCategories,
  stylePreferences,
  preferredFormality,
}: {
  wardrobe: ClothingItem[];
  gaps: CategoryGap[];
  selectedCategories: string[];
  stylePreferences: string[];
  preferredFormality: number | null;
}): Promise<ShoppingResult> {
  const byCategory = selectedCategories
    .map((cat) => {
      const items = wardrobe.filter((i) => i.category === cat);
      return `${cat} (${items.length} owned):\n${items.map((i) => `  - ${describeItem(i)}`).join("\n") || "  (none)"}`;
    })
    .join("\n\n");

  const otherCategories = wardrobe
    .filter((i) => !selectedCategories.includes(i.category))
    .map((i) => `  - [${i.category}] ${describeItem(i)}`)
    .join("\n");

  const gapSummary = gaps
    .map((g) => `${g.category}: ${g.owned} owned, one good piece unlocks ~${g.unlocks} outfit candidates`)
    .join("\n");

  const { object } = await withRetry(() =>
    generateObject({
      model: openai("gpt-4o-mini"),
      schema: shoppingSchema,
      messages: [
        {
          role: "system",
          content: `You are a personal shopper helping a client grow their wardrobe with intention.
Client styles: ${stylePreferences.join(", ") || "smart casual"}. Preferred formality: ${preferredFormality ?? 5}/10.

Suggest 3-5 specific pieces for EACH requested category. Rules:
- Every suggestion must pair with MANY existing pieces — versatility first.
- Match the client's styles (for old money: natural fabrics, muted palette, timeless cuts, no loud logos).
- Don't suggest near-duplicates of what they own.
- Be concrete: "Navy hopsack blazer", not "a nice jacket".
- reason: one sentence naming actual pieces in their wardrobe it would pair with.`,
        },
        {
          role: "user",
          content: `Requested categories: ${selectedCategories.join(", ")}

My wardrobe in those categories:
${byCategory}

The rest of my wardrobe (to pair against):
${otherCategories || "  (nothing else yet)"}

Gap analysis (deterministic):
${gapSummary}`,
        },
      ],
    }),
  );

  return object;
}
