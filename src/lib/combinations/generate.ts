import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  candidateSeasons,
  generateCandidatesForItem,
  type Candidate,
} from "@/lib/combinations/candidates";
import { scoreCandidateBatch } from "@/lib/ai/scoring";
import { MIN_OVERALL_SCORE, SCORING_BATCH_SIZE } from "@/lib/constants";
import type { ClothingItem } from "@/types/database";

/**
 * Incrementally extend the combination table with outfits containing
 * `itemId`. Idempotent: existing combinations containing the item are
 * replaced, without ever touching the rest of the table.
 */
export async function generateCombinationsForItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
): Promise<{ inserted: number; candidates: number }> {
  const { data: wardrobeData, error: wardrobeError } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .eq("ai_status", "confirmed");
  if (wardrobeError) throw wardrobeError;

  const wardrobe = (wardrobeData ?? []) as ClothingItem[];
  const newItem = wardrobe.find((i) => i.id === itemId);
  if (!newItem) throw new Error("Item not found or not confirmed");

  const { data: profile } = await supabase
    .from("profiles")
    .select("style_preferences")
    .eq("id", userId)
    .single();
  const styles: string[] = profile?.style_preferences ?? [];

  await supabase
    .from("clothing_items")
    .update({ combo_status: "generating" })
    .eq("id", itemId);

  try {
    const candidates = generateCandidatesForItem(newItem, wardrobe);

    // Replace any prior combinations containing this item (idempotent re-runs).
    await supabase
      .from("combinations")
      .delete()
      .eq("user_id", userId)
      .or(
        `top_id.eq.${itemId},bottom_id.eq.${itemId},shoes_id.eq.${itemId},outerwear_id.eq.${itemId},accessory_ids.cs.{${itemId}}`,
      );

    let inserted = 0;
    for (let i = 0; i < candidates.length; i += SCORING_BATCH_SIZE) {
      const batch = candidates.slice(i, i + SCORING_BATCH_SIZE);
      let scores;
      try {
        scores = await scoreCandidateBatch(batch, styles);
      } catch (err) {
        console.error("Scoring batch failed, skipping:", err);
        continue;
      }

      const rows = scores
        .filter((s) => s.overall_score >= MIN_OVERALL_SCORE)
        .map((s) => {
          const c: Candidate | undefined = batch[s.index];
          if (!c) return null;
          const seasons = candidateSeasons(c);
          return {
            user_id: userId,
            top_id: c.top.id,
            bottom_id: c.bottom.id,
            shoes_id: c.shoes.id,
            outerwear_id: c.outerwear?.id ?? null,
            accessory_ids: c.accessories.map((a) => a.id),
            color_harmony_score: s.color_harmony_score,
            old_money_score: s.old_money_score,
            formality_score: s.formality_score,
            weather_suitability_score: s.weather_suitability_score,
            work_score: s.work_score,
            daily_score: s.daily_score,
            overall_score: s.overall_score,
            season_suitability:
              s.season_suitability.length > 0 ? s.season_suitability : seasons,
            notes: s.notes,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length > 0) {
        const { error: insertError, count } = await supabase
          .from("combinations")
          .insert(rows, { count: "exact" });
        if (insertError) {
          console.error("Combination insert failed:", insertError);
        } else {
          inserted += count ?? rows.length;
        }
      }
    }

    await supabase
      .from("clothing_items")
      .update({ combo_status: "done" })
      .eq("id", itemId);

    return { inserted, candidates: candidates.length };
  } catch (err) {
    await supabase
      .from("clothing_items")
      .update({ combo_status: "failed" })
      .eq("id", itemId);
    throw err;
  }
}
