import "server-only";
import {
  candidateSeasons,
  generateCandidatesForItem,
  type Candidate,
} from "@/lib/combinations/candidates";
import { scoreCandidateBatch } from "@/lib/ai/scoring";
import { MIN_OVERALL_SCORE, SCORING_BATCH_SIZE } from "@/lib/constants";
import type { Wardrobe, NewOutfit } from "@/lib/wardrobe";
import type { PromptSubject } from "@/lib/people/subject";

/**
 * Incrementally extend one Person's Outfit table with Outfits containing
 * `itemId`. Idempotent: existing Outfits containing the piece are replaced,
 * without touching the rest of the table. Candidates come only from this
 * Person's pieces, so an Outfit can never mix People.
 */
export async function generateCombinationsForItem(
  wardrobe: Wardrobe,
  subject: PromptSubject,
  styles: string[],
  itemId: string,
  languageRule = "",
): Promise<{ inserted: number; candidates: number }> {
  const pieces = await wardrobe.pieces({ confirmed: true });
  const newItem = pieces.find((i) => i.id === itemId);
  if (!newItem) throw new Error("Piece not found or not confirmed");

  await wardrobe.setComboStatus([itemId], "generating");

  try {
    const candidates = generateCandidatesForItem(newItem, pieces);
    const rows: NewOutfit[] = [];

    for (let i = 0; i < candidates.length; i += SCORING_BATCH_SIZE) {
      const batch = candidates.slice(i, i + SCORING_BATCH_SIZE);
      let scores;
      try {
        scores = await scoreCandidateBatch(batch, styles, subject, languageRule);
      } catch (err) {
        console.error("Scoring batch failed, skipping:", err);
        continue;
      }

      for (const s of scores) {
        if (s.overall_score < MIN_OVERALL_SCORE) continue;
        const c: Candidate | undefined = batch[s.index];
        if (!c) continue;
        rows.push({
          top_id: c.top.id,
          bottom_id: c.bottom.id,
          shoes_id: c.shoes.id,
          outerwear_id: c.outerwear?.id ?? null,
          watch_id: c.watch?.id ?? null,
          // Sorted so the same accessory set never produces two rows.
          accessory_ids: c.accessories.map((a) => a.id).sort(),
          color_harmony_score: s.color_harmony_score,
          old_money_score: s.old_money_score,
          formality_score: s.formality_score,
          weather_suitability_score: s.weather_suitability_score,
          work_score: s.work_score,
          daily_score: s.daily_score,
          overall_score: s.overall_score,
          season_suitability:
            s.season_suitability.length > 0 ? s.season_suitability : candidateSeasons(c),
          notes: s.notes,
        });
      }
    }

    const inserted = await wardrobe.replaceOutfitsWith(itemId, rows);
    await wardrobe.setComboStatus([itemId], "done");
    return { inserted, candidates: candidates.length };
  } catch (err) {
    await wardrobe.setComboStatus([itemId], "failed");
    throw err;
  }
}
