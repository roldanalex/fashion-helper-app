import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { itemTagsSchema, type ItemTags } from "@/lib/schemas";
import { SUBCATEGORIES } from "@/lib/constants";
import { withRetry } from "@/lib/ai/retry";

export async function analyzeItemImage({
  imageUrl,
  userDescription,
  categoryHint,
}: {
  imageUrl: string;
  userDescription?: string | null;
  categoryHint?: string | null;
}): Promise<ItemTags> {
  const subcategoryGuide = Object.entries(SUBCATEGORIES)
    .map(([cat, subs]) => `${cat}: ${subs.join(", ")}`)
    .join("\n");

  const { object } = await withRetry(() =>
    generateObject({
      model: openai("gpt-4o"),
      schema: itemTagsSchema,
      messages: [
        {
          role: "system",
          content: `You are an expert fashion archivist cataloguing a client's wardrobe.
Analyze the clothing item in the photo and extract precise structured tags.

Rules:
- If the owner provided a description, treat it as ground truth — especially for
  material (e.g. "pique", "merino"), which is hard to see in photos.
- formality_level: 1 = gym wear, 5 = smart casual, 8 = business, 10 = black tie.
- old_money_score: how well the piece fits a quiet-luxury / old-money aesthetic
  (timeless cuts, natural fabrics, muted colors, no loud logos). 1-10.
- season: every season the piece comfortably suits.
- color_hex: the dominant color as a hex value.
- Choose subcategory from this guide when possible:
${subcategoryGuide}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                categoryHint ? `Category (owner-confirmed): ${categoryHint}` : null,
                userDescription
                  ? `Owner's description: ${userDescription}`
                  : "No description provided.",
              ]
                .filter(Boolean)
                .join("\n"),
            },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    }),
  );

  return object;
}
