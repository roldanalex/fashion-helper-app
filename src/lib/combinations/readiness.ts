import type { ClothingItem } from "@/types/database";

export interface WardrobeReadiness {
  hasTop: boolean;
  hasBottom: boolean;
  hasShoes: boolean;
  /** True once the minimum (top + bottom + shoes) is confirmed. */
  ready: boolean;
  /** Confirmed pieces whose outfit generation hasn't finished. */
  pendingCount: number;
}

type ReadinessItem = Pick<
  ClothingItem,
  "category" | "ai_status" | "archived" | "combo_status"
>;

/**
 * Derive outfit-readiness from already-fetched wardrobe items — no DB call.
 * An outfit needs at least one confirmed top, bottom and pair of shoes.
 */
export function getWardrobeReadiness(
  items: ReadinessItem[],
): WardrobeReadiness {
  const confirmed = items.filter(
    (i) => !i.archived && i.ai_status === "confirmed",
  );
  const has = (category: string) =>
    confirmed.some((i) => i.category === category);

  const hasTop = has("top");
  const hasBottom = has("bottom");
  const hasShoes = has("shoes");
  const pendingCount = confirmed.filter(
    (i) => i.combo_status !== "done",
  ).length;

  return {
    hasTop,
    hasBottom,
    hasShoes,
    ready: hasTop && hasBottom && hasShoes,
    pendingCount,
  };
}
