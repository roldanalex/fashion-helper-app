/**
 * In-memory adapter for the WardrobeStore port, for tests. Holds rows for
 * any number of People so tests can prove nothing leaks between them.
 */
import type {
  ClothingItem,
  Combination,
  DailyPlan,
  ShoppingSuggestion,
} from "@/types/database";
import type { WardrobeStore } from "@/lib/wardrobe/store";

export interface MemoryState {
  pieces: ClothingItem[];
  outfits: Combination[];
  plans: DailyPlan[];
  suggestions: ShoppingSuggestion[];
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-mem-${++seq}`;

const outfitKey = (o: Pick<Combination, "person_id" | "top_id" | "bottom_id" | "shoes_id" | "outerwear_id" | "watch_id" | "accessory_ids">) =>
  [o.person_id, o.top_id, o.bottom_id, o.shoes_id, o.outerwear_id ?? "", o.watch_id ?? "", [...o.accessory_ids].sort().join(",")].join("|");

export function memoryStore(seed: Partial<MemoryState> = {}): WardrobeStore & { state: MemoryState } {
  const state: MemoryState = {
    pieces: [...(seed.pieces ?? [])],
    outfits: [...(seed.outfits ?? [])],
    plans: [...(seed.plans ?? [])],
    suggestions: [...(seed.suggestions ?? [])],
  };

  return {
    state,

    async pieces(personId, q) {
      return state.pieces.filter(
        (p) =>
          p.person_id === personId &&
          p.archived === !!q.archivedOnly &&
          (!q.confirmed || p.ai_status === "confirmed") &&
          (!q.categories?.length || q.categories.includes(p.category)) &&
          (!q.ids || q.ids.includes(p.id)) &&
          (!q.comboStatusIn?.length || q.comboStatusIn.includes(p.combo_status)),
      );
    },

    async insertPiece(personId, accountId, piece) {
      state.pieces.push({
        name: "New item",
        subcategory: null,
        color_name: null,
        color_hex: null,
        pattern: null,
        material: null,
        description: null,
        season: [],
        formality_level: null,
        old_money_score: null,
        attributes: {},
        ai_status: "pending",
        combo_status: "none",
        last_worn: null,
        wear_count: 0,
        purchase_price: null,
        archived: false,
        created_at: new Date().toISOString(),
        ...piece,
        user_id: accountId,
        person_id: personId,
      });
    },

    async updatePieces(personId, ids, patch) {
      let n = 0;
      for (const p of state.pieces) {
        if (p.person_id === personId && ids.includes(p.id)) {
          Object.assign(p, patch);
          n += 1;
        }
      }
      return n;
    },

    async outfits(personId, q) {
      const a = q.around ?? {};
      return state.outfits
        .filter(
          (o) =>
            o.person_id === personId &&
            (q.includeHidden || !o.hidden) &&
            (q.minScore == null || o.overall_score >= q.minScore) &&
            (!q.seasonsAny?.length || o.season_suitability.some((s) => q.seasonsAny!.includes(s))) &&
            (!q.ids || q.ids.includes(o.id)) &&
            (!a.top || o.top_id === a.top) &&
            (!a.bottom || o.bottom_id === a.bottom) &&
            (!a.shoes || o.shoes_id === a.shoes) &&
            (!a.outerwear || o.outerwear_id === a.outerwear) &&
            (!a.watch || o.watch_id === a.watch) &&
            (!a.accessory || o.accessory_ids.includes(a.accessory)),
        )
        .sort((x, y) => Number(y.boosted) - Number(x.boosted) || y.overall_score - x.overall_score)
        .slice(0, q.limit ?? Infinity);
    },

    async countOutfits(personId) {
      return state.outfits.filter((o) => o.person_id === personId && !o.hidden).length;
    },

    async insertOutfits(personId, accountId, rows) {
      let n = 0;
      for (const r of rows) {
        const row: Combination = {
          ...r,
          id: nextId("outfit"),
          user_id: accountId,
          person_id: personId,
          boosted: false,
          hidden: false,
          last_recommended: null,
          created_at: new Date().toISOString(),
        };
        // Mirrors the database: every slot must be this Person's piece.
        const own = new Set(state.pieces.filter((p) => p.person_id === personId).map((p) => p.id));
        const slots = [row.top_id, row.bottom_id, row.shoes_id, row.outerwear_id, row.watch_id, ...row.accessory_ids].filter(Boolean) as string[];
        if (!slots.every((id) => own.has(id))) throw new Error("An outfit's pieces must belong to the same person");
        if (state.outfits.some((o) => outfitKey(o) === outfitKey(row))) continue;
        state.outfits.push(row);
        n += 1;
      }
      return n;
    },

    async updateOutfits(personId, ids, patch) {
      let n = 0;
      for (const o of state.outfits) {
        if (o.person_id === personId && ids.includes(o.id)) {
          Object.assign(o, patch);
          n += 1;
        }
      }
      return n;
    },

    async deleteOutfitsWith(personId, pieceId) {
      state.outfits = state.outfits.filter(
        (o) =>
          o.person_id !== personId ||
          ![o.top_id, o.bottom_id, o.shoes_id, o.outerwear_id, o.watch_id, ...o.accessory_ids].includes(pieceId),
      );
    },

    async plan(personId, date, occasion) {
      return state.plans.find((p) => p.person_id === personId && p.plan_date === date && p.occasion === occasion) ?? null;
    },

    async upsertPlan(personId, accountId, plan) {
      const existing = state.plans.find(
        (p) => p.person_id === personId && p.plan_date === plan.plan_date && p.occasion === plan.occasion,
      );
      if (existing) {
        Object.assign(existing, plan);
        return existing;
      }
      const row: DailyPlan = {
        ...plan,
        id: nextId("plan"),
        user_id: accountId,
        person_id: personId,
        worn_combination_id: null,
        created_at: new Date().toISOString(),
      };
      state.plans.push(row);
      return row;
    },

    async setPlanWorn(personId, planId, outfitId) {
      const plan = state.plans.find((p) => p.person_id === personId && p.id === planId);
      if (!plan) return null;
      plan.worn_combination_id = outfitId;
      return plan;
    },

    async suggestions(personId, statuses) {
      return state.suggestions.filter((s) => s.person_id === personId && statuses.includes(s.status));
    },

    async setSuggestionStatus(personId, id, status) {
      const s = state.suggestions.find((x) => x.person_id === personId && x.id === id);
      if (!s) return 0;
      s.status = status;
      return 1;
    },

    async replaceSuggestions(personId, accountId, categories, rows) {
      state.suggestions = state.suggestions.filter(
        (s) => !(s.person_id === personId && s.status === "suggested" && categories.includes(s.category)),
      );
      const added = rows.map<ShoppingSuggestion>((r) => ({
        ...r,
        id: nextId("suggestion"),
        user_id: accountId,
        person_id: personId,
        status: "suggested",
        created_at: new Date().toISOString(),
      }));
      state.suggestions.push(...added);
      return added;
    },
  };
}
