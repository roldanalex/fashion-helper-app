import { describe, expect, it } from "vitest";
import { getWardrobeReadiness } from "@/lib/combinations/readiness";
import { baseWardrobe, makeItem } from "@/test/fixtures";

describe("getWardrobeReadiness", () => {
  it("is ready once a confirmed top, bottom and shoes exist", () => {
    const r = getWardrobeReadiness(baseWardrobe());
    expect(r.ready).toBe(true);
    expect(r.hasOuterwear).toBe(false);
    expect(r.hasWatch).toBe(false);
    expect(r.hasAccessory).toBe(false);
    expect(r.pendingCount).toBe(0);
  });

  it("is not ready when a required slot is only tagged, not confirmed", () => {
    const [top, bottom, shoes] = baseWardrobe();
    shoes.ai_status = "tagged";
    const r = getWardrobeReadiness([top, bottom, shoes]);
    expect(r.ready).toBe(false);
    expect(r.hasShoes).toBe(false);
  });

  it("reports optional layers and pieces still waiting for outfits", () => {
    const items = [
      ...baseWardrobe(),
      makeItem({ category: "outerwear", combo_status: "queued" }),
      makeItem({ category: "watch", subcategory: "sports" }),
      makeItem({ category: "accessory", subcategory: "belt" }),
    ];
    const r = getWardrobeReadiness(items);
    expect(r.hasOuterwear).toBe(true);
    expect(r.hasWatch).toBe(true);
    expect(r.hasAccessory).toBe(true);
    expect(r.pendingCount).toBe(1);
  });

  it("ignores archived pieces entirely", () => {
    const items = baseWardrobe().map((i) => ({ ...i, archived: true }));
    expect(getWardrobeReadiness(items).ready).toBe(false);
  });
});
