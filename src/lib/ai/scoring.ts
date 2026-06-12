import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { combinationBatchSchema, type CombinationScore } from "@/lib/schemas";
import { describeCandidate } from "@/lib/ai/describe";
import { withRetry } from "@/lib/ai/retry";
import type { Candidate } from "@/lib/combinations/candidates";

/**
 * Score one batch of candidate combinations (text-only, gpt-4o-mini).
 * Returns scores keyed by the candidate's index within the batch.
 */
export async function scoreCandidateBatch(
  batch: Candidate[],
  stylePreferences: string[],
): Promise<CombinationScore[]> {
  const descriptors = batch.map((c, i) => describeCandidate(c, i)).join("\n\n");
  const styles = stylePreferences.length
    ? stylePreferences.join(", ")
    : "smart casual";

  const { object } = await withRetry(() =>
    generateObject({
      model: openai("gpt-4o-mini"),
      schema: combinationBatchSchema,
      messages: [
        {
          role: "system",
          content: `You are a meticulous personal stylist scoring outfit combinations 0-10.
The client's preferred styles: ${styles}.

Scoring guide (decimals encouraged):
- color_harmony_score: how well the palette works together.
- old_money_score: quiet-luxury timelessness of the full look.
- formality_score: 1 loungewear … 10 black tie (a rating, not quality).
- weather_suitability_score: versatility across mild conditions.
- work_score: suitability for an office/business-casual day.
- daily_score: suitability for errands, mall, park, casual meetups.
- overall_score: would a great stylist actually put this on the client?
  Be discerning — most random pairings deserve < 7. Reserve 8.5+ for
  genuinely excellent looks. Weight the client's preferred styles.
- season_suitability: the seasons the full outfit suits.
- notes: ONE short stylist sentence (used later to explain the outfit).

Score EVERY candidate, echoing its [index].`,
        },
        { role: "user", content: descriptors },
      ],
    }),
  );

  return object.scores;
}
