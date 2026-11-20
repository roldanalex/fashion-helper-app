/**
 * The WardrobeStore port: storage operations already scoped to one Person.
 * Two adapters satisfy it: Supabase (production) and in-memory (tests).
 * Callers never use a store directly; they go through openWardrobe().
 */
import type {
  Category,
  ClothingItem,
  ComboStatus,
  Combination,
  DailyPlan,
  ShoppingSuggestion,
  SuggestionStatus,
} from "@/types/database";

export interface PieceQuery {
  /** Only confirmed pieces. */
  confirmed?: boolean;
  /** Only archived pieces (default: only non-archived). */
  archivedOnly?: boolean;
  categories?: Category[];
  ids?: string[];
  comboStatusIn?: ComboStatus[];
}

export type OutfitSlot = "top" | "bottom" | "shoes" | "outerwear" | "watch" | "accessory";

export interface OutfitQuery {
  minScore?: number;
  includeHidden?: boolean;
  /** Outfits suitable for at least one of these seasons. */
  seasonsAny?: string[];
  /** Outfits that contain these pieces in these slots. */
  around?: Partial<Record<OutfitSlot, string>>;
  ids?: string[];
  limit?: number;
}

/** Columns a caller supplies for a new piece; ids and ownership are added by the store. */
export type NewPiece = Pick<ClothingItem, "category" | "image_url"> &
  Partial<Pick<ClothingItem, "description" | "name">> & { id: string };

export type PiecePatch = Partial<
  Omit<ClothingItem, "id" | "user_id" | "person_id" | "created_at">
>;

export type NewOutfit = Omit<
  Combination,
  "id" | "user_id" | "person_id" | "created_at" | "boosted" | "hidden" | "last_recommended"
>;

export type OutfitPatch = Partial<Pick<Combination, "boosted" | "hidden" | "last_recommended">>;

export type NewPlan = Omit<DailyPlan, "id" | "user_id" | "person_id" | "created_at" | "worn_combination_id">;

export type NewSuggestion = Omit<
  ShoppingSuggestion,
  "id" | "user_id" | "person_id" | "created_at" | "status"
>;

export interface WardrobeStore {
  pieces(personId: string, q: PieceQuery): Promise<ClothingItem[]>;
  insertPiece(personId: string, accountId: string, piece: NewPiece): Promise<void>;
  updatePieces(personId: string, ids: string[], patch: PiecePatch): Promise<number>;

  outfits(personId: string, q: OutfitQuery): Promise<Combination[]>;
  countOutfits(personId: string): Promise<number>;
  /** Inserts what it can; an identical existing outfit is skipped, not an error. */
  insertOutfits(personId: string, accountId: string, rows: NewOutfit[]): Promise<number>;
  updateOutfits(personId: string, ids: string[], patch: OutfitPatch): Promise<number>;
  deleteOutfitsWith(personId: string, pieceId: string): Promise<void>;

  plan(personId: string, date: string, occasion: string): Promise<DailyPlan | null>;
  upsertPlan(personId: string, accountId: string, plan: NewPlan): Promise<DailyPlan | null>;
  setPlanWorn(personId: string, planId: string, outfitId: string): Promise<DailyPlan | null>;

  suggestions(personId: string, statuses: SuggestionStatus[]): Promise<ShoppingSuggestion[]>;
  setSuggestionStatus(personId: string, id: string, status: SuggestionStatus): Promise<number>;
  replaceSuggestions(
    personId: string,
    accountId: string,
    categories: string[],
    rows: NewSuggestion[],
  ): Promise<ShoppingSuggestion[]>;
}

export class WardrobeError extends Error {}
