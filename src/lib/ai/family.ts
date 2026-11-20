import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { describeItem } from "@/lib/ai/describe";
import { withRetry } from "@/lib/ai/retry";
import { OCCASION_HINTS, type Occasion } from "@/lib/constants";
import type { PromptSubject } from "@/lib/people/subject";
import type { ClothingItem } from "@/types/database";

const notesSchema = z.object({
  notes: z
    .array(z.object({ look: z.number().int(), note: z.string() }))
    .describe("One note per look, echoing its number"),
});

export interface LookForNarration {
  members: { subject: PromptSubject; pieces: ClothingItem[] }[];
}

/**
 * One short "why this works" note per Family look. The model sees only the
 * prompt-safe view of each Person (aliases and audiences, docs/adr/0002) and
 * descriptions of their clothes; it never chooses the outfits.
 */
export async function narrateFamilyLooks({
  looks,
  occasion,
  weatherSummary,
  languageRule = "",
}: {
  looks: LookForNarration[];
  occasion: Occasion;
  weatherSummary: string | null;
  /** aiLanguageRule(locale) */
  languageRule?: string;
}): Promise<string[]> {
  if (looks.length === 0) return [];
  const text = looks
    .map(
      (look, i) =>
        `Look ${i + 1}:\n` +
        look.members
          .map(
            ({ subject, pieces }) =>
              `  ${subject.alias} (${subject.audience}): ${pieces.map((p) => describeItem(p)).join("; ")}`,
          )
          .join("\n"),
    )
    .join("\n\n");

  const { object } = await withRetry(() =>
    generateObject({
      model: openai("gpt-4o-mini"),
      schema: notesSchema,
      messages: [
        {
          role: "system",
          content: `You are a family's personal stylist. Each look below dresses several family members for the same occasion; the outfits are already chosen from their own wardrobes.
For each look, write ONE or TWO warm, concrete sentences on why the outfits work together: the shared or complementary colours, the matching level of dress, and anything practical about the weather or occasion.
Refer to people only by the labels given (for example "Person 1", "Child A"); never invent names, ages or looks. Judge the clothes, never the people.${languageRule ? `\n${languageRule} Keep the labels ("Person 1", "Child A") exactly as given.` : ""}`,
        },
        {
          role: "user",
          content: `Occasion: ${occasion}: ${OCCASION_HINTS[occasion]}
Weather: ${weatherSummary ?? "unknown"}

${text}`,
        },
      ],
    }),
  );

  return looks.map((_, i) => object.notes.find((n) => n.look === i + 1)?.note ?? "");
}
