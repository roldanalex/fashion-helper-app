import { describe, expect, it } from "vitest";
import { analyzeGaps } from "@/lib/gap-analysis";
import { CATEGORIES } from "@/lib/constants";
import { baseWardrobe, makeItem } from "@/test/fixtures";

describe("analyzeGaps", () => {
  it("returns one row per category, sorted by unlock potential", () => {
    const gaps = analyzeGaps(baseWardrobe(), 6);
    expect(gaps.map((g) => g.category).sort()).toEqual([...CATEGORIES].sort());
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].unlocks).toBeGreaterThanOrEqual(gaps[i].unlocks);
    }
  });

  it("counts how many outfits one new piece would unlock per category", () => {
    // Three tops, three bottoms, one pair of shoes: a second pair of shoes
    // unlocks 9 tuples (3 × 3 × 1). An outerwear or accessory probe also
    // multiplies every existing tuple, so it ties at 9; a new top only 3.
    const wardrobe = [
      ...baseWardrobe(),
      makeItem({ category: "top" }),
      makeItem({ category: "top" }),
      makeItem({ category: "bottom" }),
      makeItem({ category: "bottom" }),
    ];
    const gaps = analyzeGaps(wardrobe, 6);
    const byCat = Object.fromEntries(gaps.map((g) => [g.category, g]));
    expect(byCat.shoes.unlocks).toBe(9);
    expect(byCat.shoes.owned).toBe(1);
    expect(byCat.top.unlocks).toBe(3);
    expect(byCat.outerwear.unlocks).toBe(9);

    // Every flagged bottleneck has the maximum unlock count.
    const max = Math.max(...gaps.map((g) => g.unlocks));
    for (const g of gaps) expect(g.bottleneck).toBe(g.unlocks === max);
  });

  it("counts owned pieces per category", () => {
    const gaps = analyzeGaps(baseWardrobe(), null);
    const byCat = Object.fromEntries(gaps.map((g) => [g.category, g.owned]));
    expect(byCat.top).toBe(1);
    expect(byCat.accessory).toBe(0);
  });
});
