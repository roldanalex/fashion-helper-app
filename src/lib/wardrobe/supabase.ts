/**
 * Supabase adapter for the WardrobeStore port. The only module allowed to
 * query the wardrobe tables directly (see scoping.test.ts); every query is
 * filtered by person_id, so correctness never depends on RLS alone.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClothingItem,
  Combination,
  DailyPlan,
  ShoppingSuggestion,
} from "@/types/database";
import { WardrobeError, type WardrobeStore } from "@/lib/wardrobe/store";

const ITEMS = "clothing_items";
const OUTFITS = "combinations";
const PLANS = "daily_plans";
const SUGGESTIONS = "shopping_suggestions";

function fail(what: string, error: { message: string; code?: string }): never {
  console.error(`Wardrobe: ${what} failed:`, error.message);
  throw new WardrobeError(`Could not ${what}.`);
}

export function supabaseStore(supabase: SupabaseClient): WardrobeStore {
  return {
    async pieces(personId, q) {
      let query = supabase
        .from(ITEMS)
        .select("*")
        .eq("person_id", personId)
        .eq("archived", !!q.archivedOnly)
        .order("created_at", { ascending: false });
      if (q.confirmed) query = query.eq("ai_status", "confirmed");
      if (q.categories?.length) query = query.in("category", q.categories);
      if (q.ids) query = query.in("id", q.ids.length ? q.ids : ["00000000-0000-0000-0000-000000000000"]);
      if (q.comboStatusIn?.length) query = query.in("combo_status", q.comboStatusIn);
      const { data, error } = await query;
      if (error) fail("load pieces", error);
      return (data ?? []) as ClothingItem[];
    },

    async insertPiece(personId, accountId, piece) {
      const { error } = await supabase
        .from(ITEMS)
        .insert({ ...piece, person_id: personId, user_id: accountId });
      if (error) fail("add the piece", error);
    },

    async updatePieces(personId, ids, patch) {
      if (ids.length === 0) return 0;
      const { data, error } = await supabase
        .from(ITEMS)
        .update(patch)
        .eq("person_id", personId)
        .in("id", ids)
        .select("id");
      if (error) fail("update the piece", error);
      return data?.length ?? 0;
    },

    async outfits(personId, q) {
      let query = supabase
        .from(OUTFITS)
        .select("*")
        .eq("person_id", personId)
        .order("boosted", { ascending: false })
        .order("overall_score", { ascending: false });
      if (!q.includeHidden) query = query.eq("hidden", false);
      if (q.minScore != null) query = query.gte("overall_score", q.minScore);
      if (q.seasonsAny?.length) query = query.overlaps("season_suitability", q.seasonsAny);
      if (q.ids) query = query.in("id", q.ids.length ? q.ids : ["00000000-0000-0000-0000-000000000000"]);
      const a = q.around ?? {};
      if (a.top) query = query.eq("top_id", a.top);
      if (a.bottom) query = query.eq("bottom_id", a.bottom);
      if (a.shoes) query = query.eq("shoes_id", a.shoes);
      if (a.outerwear) query = query.eq("outerwear_id", a.outerwear);
      if (a.watch) query = query.eq("watch_id", a.watch);
      if (a.accessory) query = query.contains("accessory_ids", [a.accessory]);
      if (q.limit) query = query.limit(q.limit);
      const { data, error } = await query;
      if (error) fail("load outfits", error);
      return (data ?? []) as Combination[];
    },

    async countOutfits(personId) {
      const { count, error } = await supabase
        .from(OUTFITS)
        .select("id", { count: "exact", head: true })
        .eq("person_id", personId)
        .eq("hidden", false);
      if (error) fail("count outfits", error);
      return count ?? 0;
    },

    async insertOutfits(personId, accountId, rows) {
      if (rows.length === 0) return 0;
      const full = rows.map((r) => ({ ...r, person_id: personId, user_id: accountId }));
      const { error, count } = await supabase.from(OUTFITS).insert(full, { count: "exact" });
      if (!error) return count ?? full.length;
      if (error.code !== "23505") {
        console.error("Outfit insert failed:", error.message);
        return 0;
      }
      // An identical outfit already exists: insert row by row so one duplicate
      // never discards the rest of the batch.
      let ok = 0;
      for (const row of full) {
        const { error: rowError } = await supabase.from(OUTFITS).insert(row);
        if (!rowError) ok += 1;
        else if (rowError.code !== "23505") console.error("Outfit insert failed:", rowError.message);
      }
      return ok;
    },

    async updateOutfits(personId, ids, patch) {
      if (ids.length === 0) return 0;
      const { data, error } = await supabase
        .from(OUTFITS)
        .update(patch)
        .eq("person_id", personId)
        .in("id", ids)
        .select("id");
      if (error) fail("update the outfit", error);
      return data?.length ?? 0;
    },

    async deleteOutfitsWith(personId, pieceId) {
      const { error } = await supabase
        .from(OUTFITS)
        .delete()
        .eq("person_id", personId)
        .or(
          `top_id.eq.${pieceId},bottom_id.eq.${pieceId},shoes_id.eq.${pieceId},outerwear_id.eq.${pieceId},watch_id.eq.${pieceId},accessory_ids.cs.{${pieceId}}`,
        );
      if (error) fail("replace outfits", error);
    },

    async plan(personId, date, occasion) {
      const { data, error } = await supabase
        .from(PLANS)
        .select("*")
        .eq("person_id", personId)
        .eq("plan_date", date)
        .eq("occasion", occasion)
        .maybeSingle();
      if (error) fail("load the plan", error);
      return (data as DailyPlan | null) ?? null;
    },

    async upsertPlan(personId, accountId, plan) {
      const { data, error } = await supabase
        .from(PLANS)
        .upsert(
          { ...plan, person_id: personId, user_id: accountId },
          { onConflict: "person_id,plan_date,occasion" },
        )
        .select()
        .single();
      if (error) {
        console.error("Plan save failed:", error.message);
        return null;
      }
      return data as DailyPlan;
    },

    async setPlanWorn(personId, planId, outfitId) {
      const { data, error } = await supabase
        .from(PLANS)
        .update({ worn_combination_id: outfitId })
        .eq("person_id", personId)
        .eq("id", planId)
        .select("*")
        .maybeSingle();
      if (error) fail("record what was worn", error);
      return (data as DailyPlan | null) ?? null;
    },

    async suggestions(personId, statuses) {
      const { data, error } = await supabase
        .from(SUGGESTIONS)
        .select("*")
        .eq("person_id", personId)
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) fail("load suggestions", error);
      return (data ?? []) as ShoppingSuggestion[];
    },

    async setSuggestionStatus(personId, id, status) {
      const { data, error } = await supabase
        .from(SUGGESTIONS)
        .update({ status })
        .eq("person_id", personId)
        .eq("id", id)
        .select("id");
      if (error) fail("update the suggestion", error);
      return data?.length ?? 0;
    },

    async replaceSuggestions(personId, accountId, categories, rows) {
      const { error: delError } = await supabase
        .from(SUGGESTIONS)
        .delete()
        .eq("person_id", personId)
        .eq("status", "suggested")
        .in("category", categories);
      if (delError) fail("replace suggestions", delError);
      if (rows.length === 0) return [];
      const { data, error } = await supabase
        .from(SUGGESTIONS)
        .insert(rows.map((r) => ({ ...r, person_id: personId, user_id: accountId })))
        .select();
      if (error) fail("save suggestions", error);
      return (data ?? []) as ShoppingSuggestion[];
    },
  };
}
