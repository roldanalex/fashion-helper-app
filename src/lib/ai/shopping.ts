import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { shoppingSchema, type ShoppingResult } from "@/lib/schemas";
import { describeItem } from "@/lib/ai/describe";
import { withRetry } from "@/lib/ai/retry";
import type { CategoryGap } from "@/lib/gap-analysis";
import type { ClothingItem } from "@/types/database";
import { PERSONAL_FIT_RULE } from "@/lib/personal/client-profile";
import type { PromptSubject } from "@/lib/people/subject";

export async function suggestPurchases({
  wardrobe,
  gaps,
  selectedCategories,
  subject,
  languageRule = "",
}: {
  wardrobe: ClothingItem[];
  gaps: CategoryGap[];
  selectedCategories: string[];
  /** Who the pieces are for: the prompt-safe view only (docs/adr/0002). */
  subject: PromptSubject;
  /** aiLanguageRule(locale) */
  languageRule?: string;
}): Promise<ShoppingResult> {
  const personal = subject.personalBlock;
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
Client ${subject.styleLine}
${subject.isMinor ? `${subject.audienceGuide} Suggest durable, easy-care pieces with a little growing room; skip the old-money rules below and never suggest anything inappropriate for a young person.
` : ""}${personal ? `${personal}
${PERSONAL_FIT_RULE} For tops, knitwear and jackets, suggest colours from the client's season; for every piece, suggest cuts that suit their build and fit preference.
` : ""}
Suggest 3-5 specific pieces for EACH requested category. Rules:
- Every suggestion must pair with MANY existing pieces — versatility first.
- Match the client's styles (for adults choosing old money: natural fabrics, muted palette, timeless cuts, no loud logos).
- Don't suggest near-duplicates of what they own.
- Be concrete: "Navy hopsack blazer", not "a nice jacket".
- reason: one sentence naming actual pieces in their wardrobe it would pair with.${languageRule ? `\n${languageRule}` : ""}`,
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
