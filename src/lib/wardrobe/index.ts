/**
 * Wardrobe: the one place wardrobe data is scoped to a Person (docs/adr/0001).
 *
 * openWardrobe(store, { personId, accountId }) returns everything the app
 * does with one Person's Pieces, Outfits, plans and shopping suggestions.
 * Guarantees, whatever the store:
 *   - every read and write is limited to that Person;
 *   - Outfits containing an archived Piece are never returned;
 *   - piece()/outfitsByIds() return nothing for another Person's ids.
 */
import { getWardrobeReadiness, type WardrobeReadiness } from "@/lib/combinations/readiness";
import type {
  ClothingItem,
  ComboStatus,
  Combination,
  DailyPlan,
  RankedRecommendation,
  ShoppingSuggestion,
  SuggestionStatus,
} from "@/types/database";
import type {
  NewOutfit,
  NewPiece,
  NewPlan,
  NewSuggestion,
  OutfitPatch,
  OutfitQuery,
  PiecePatch,
  PieceQuery,
  WardrobeStore,
} from "@/lib/wardrobe/store";

export type { WardrobeStore } from "@/lib/wardrobe/store";
export type { OutfitQuery, PieceQuery, NewOutfit, NewSuggestion } from "@/lib/wardrobe/store";

export interface Wardrobe {
  readonly personId: string;

  pieces(q?: PieceQuery): Promise<ClothingItem[]>;
  piece(id: string): Promise<ClothingItem | null>;
  addPiece(piece: NewPiece): Promise<void>;
  /** False when the piece is not this Person's. */
  updatePiece(id: string, patch: PiecePatch): Promise<boolean>;
  setComboStatus(ids: string[], status: ComboStatus): Promise<void>;
  readiness(): Promise<WardrobeReadiness>;

  outfits(q?: OutfitQuery): Promise<Combination[]>;
  outfitsByIds(ids: string[]): Promise<Combination[]>;
  outfitCount(): Promise<number>;
  /** Replace every Outfit containing pieceId with these rows; returns how many were stored. */
  replaceOutfitsWith(pieceId: string, rows: NewOutfit[]): Promise<number>;
  addOutfits(rows: NewOutfit[]): Promise<number>;
  updateOutfit(id: string, patch: OutfitPatch): Promise<boolean>;
  markRecommended(ids: string[]): Promise<void>;

  plan(date: string, occasion: string): Promise<DailyPlan | null>;
  savePlan(plan: NewPlan): Promise<DailyPlan | null>;
  /** Link the plan to what was worn, rest the Outfit and count wear on each Piece actually worn. */
  recordWorn(planId: string, outfitId: string): Promise<boolean>;

  suggestions(statuses: SuggestionStatus[]): Promise<ShoppingSuggestion[]>;
  setSuggestionStatus(id: string, status: SuggestionStatus): Promise<boolean>;
  replaceSuggestions(categories: string[], rows: NewSuggestion[]): Promise<ShoppingSuggestion[]>;
}

/** Every piece id an Outfit wears by default. */
export function outfitPieceIds(c: Pick<Combination, "top_id" | "bottom_id" | "shoes_id" | "outerwear_id" | "watch_id" | "accessory_ids">): string[] {
  return [c.top_id, c.bottom_id, c.shoes_id, c.outerwear_id, c.watch_id, ...c.accessory_ids].filter(
    (id): id is string => !!id,
  );
}

export function openWardrobe(
  store: WardrobeStore,
  { personId, accountId }: { personId: string; accountId: string },
): Wardrobe {
  const withoutArchived = async (outfits: Combination[]) => {
    if (outfits.length === 0) return outfits;
    const archived = new Set((await store.pieces(personId, { archivedOnly: true })).map((p) => p.id));
    if (archived.size === 0) return outfits;
    return outfits.filter((o) => !outfitPieceIds(o).some((id) => archived.has(id)));
  };

  return {
    personId,

    pieces: (q = {}) => store.pieces(personId, q),
    async piece(id) {
      const [found] = await store.pieces(personId, { ids: [id] });
      if (found) return found;
      const [archived] = await store.pieces(personId, { ids: [id], archivedOnly: true });
      return archived ?? null;
    },
    addPiece: (piece) => store.insertPiece(personId, accountId, piece),
    async updatePiece(id, patch) {
      return (await store.updatePieces(personId, [id], patch)) > 0;
    },
    async setComboStatus(ids, status) {
      if (ids.length) await store.updatePieces(personId, ids, { combo_status: status });
    },
    async readiness() {
      return getWardrobeReadiness(await store.pieces(personId, {}));
    },

    async outfits(q = {}) {
      return withoutArchived(await store.outfits(personId, q));
    },
    async outfitsByIds(ids) {
      if (ids.length === 0) return [];
      const found = await withoutArchived(await store.outfits(personId, { ids, includeHidden: true }));
      const byId = new Map(found.map((o) => [o.id, o]));
      return ids.map((id) => byId.get(id)).filter((o): o is Combination => !!o);
    },
    outfitCount: () => store.countOutfits(personId),
    async replaceOutfitsWith(pieceId, rows) {
      await store.deleteOutfitsWith(personId, pieceId);
      return store.insertOutfits(personId, accountId, rows);
    },
    addOutfits: (rows) => store.insertOutfits(personId, accountId, rows),
    async updateOutfit(id, patch) {
      return (await store.updateOutfits(personId, [id], patch)) > 0;
    },
    async markRecommended(ids) {
      if (ids.length) await store.updateOutfits(personId, ids, { last_recommended: new Date().toISOString() });
    },

    plan: (date, occasion) => store.plan(personId, date, occasion),
    savePlan: (plan) => store.upsertPlan(personId, accountId, plan),
    async recordWorn(planId, outfitId) {
      const [outfit] = await store.outfits(personId, { ids: [outfitId], includeHidden: true });
      if (!outfit) return false;
      const plan = await store.setPlanWorn(personId, planId, outfitId);
      if (!plan) return false;

      // The watch and accessories actually worn are the day's picks, not the table defaults.
      const pick = ((plan.recommendations ?? []) as RankedRecommendation[]).find(
        (p) => p.combination_id === outfitId,
      );
      await store.updateOutfits(personId, [outfitId], { last_recommended: new Date().toISOString() });

      const wornIds = [
        outfit.top_id,
        outfit.bottom_id,
        outfit.shoes_id,
        outfit.outerwear_id,
        pick?.watch_id ?? outfit.watch_id,
        ...(pick?.accessory_ids?.length ? pick.accessory_ids : outfit.accessory_ids),
      ].filter((id): id is string => !!id);
      const today = new Date().toISOString().slice(0, 10);
      const pieces = await store.pieces(personId, { ids: wornIds });
      for (const p of pieces) {
        await store.updatePieces(personId, [p.id], { wear_count: p.wear_count + 1, last_worn: today });
      }
      return true;
    },

    suggestions: (statuses) => store.suggestions(personId, statuses),
    async setSuggestionStatus(id, status) {
      return (await store.setSuggestionStatus(personId, id, status)) > 0;
    },
    replaceSuggestions: (categories, rows) =>
      store.replaceSuggestions(personId, accountId, categories, rows),
  };
}
