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
- color_hex: the dominant color as a hex value (for a watch: the dial color).
- Choose subcategory from this guide when possible:
${subcategoryGuide}

Accessories — fill \`attributes\` (leave every field null for non-accessories):
- material for metal accessories is the case/bracelet metal: steel, gold, titanium.
- Watches: watch_style (dress = thin case, plain dial, usually leather;
  sports = steel bracelet, everyday; diver = rotating bezel, lume; gmt = 24-hour
  bezel or hand for a second time zone; chronograph = sub-dials/pushers; field;
  pilot), band (bracelet, leather, rubber, fabric) and hardware_tone (silver for
  steel, gold, rose gold, two-tone). Name the brand and model if legible.
- Belts, sunglasses, bags: hardware_tone of the buckle, frame or fittings.
- Watch formality: dress watch 8-9, classic steel sports watch 6-7, diver or
  rubber-strap 5-6, digital or smartwatch 3-4.
- Watch old_money_score: dress watch on leather (Cartier Tank, Calatrava) 9-10;
  classic steel sports (Datejust, Carrera, Black Bay, Aqua Terra) 7-8; coloured
  bezels or rubber take a point off; loud, oversized or digital 2-4.`,
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
