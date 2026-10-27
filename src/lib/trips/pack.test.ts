import { describe, expect, it } from "vitest";
import { makeCombination, makeItem } from "@/test/fixtures";
import { combinationItemIds, planPacking, type PackSlot } from "@/lib/trips/pack";
import type { ClothingItem, Combination } from "@/types/database";

const allSeasons = ["spring", "summer", "fall", "winter"];

function wardrobe(): Map<string, ClothingItem> {
  const items = [
    makeItem({ id: "top-1", category: "top", name: "Navy polo" }),
    makeItem({ id: "top-2", category: "top", name: "White oxford" }),
    makeItem({ id: "top-3", category: "top", name: "Linen shirt", season: ["summer"] }),
    makeItem({ id: "bottom-1", category: "bottom", name: "Tan chinos" }),
    makeItem({ id: "bottom-2", category: "bottom", name: "Grey trousers" }),
    makeItem({ id: "shoes-1", category: "shoes", name: "Brown loafers", material: "leather" }),
    makeItem({ id: "shoes-2", category: "shoes", name: "Suede drivers", material: "suede" }),
    makeItem({ id: "outer-1", category: "outerwear", name: "Navy blazer" }),
    makeItem({ id: "watch-1", category: "watch", name: "Steel GMT" }),
  ];
  return new Map(items.map((i) => [i.id, i]));
}

const combo = (overrides: Partial<Combination>) =>
  makeCombination({ season_suitability: allSeasons, ...overrides });

const slot = (
  date: string,
  occasion: PackSlot["occasion"],
  tempC: number | null = 18,
  rainy = false,
): PackSlot => ({
  key: `${date}#${occasion}`,
  date,
  occasion,
  weather: { tempC, rainy },
});

describe("combinationItemIds", () => {
  it("lists every filled slot once, including watch and accessories", () => {
    const c = combo({
      id: "c",
      outerwear_id: "outer-1",
      watch_id: "watch-1",
      accessory_ids: ["belt-1"],
    });
    expect(combinationItemIds(c)).toEqual([
      "top-1",
      "bottom-1",
      "shoes-1",
      "outer-1",
      "watch-1",
      "belt-1",
    ]);
  });
});

describe("planPacking", () => {
  it("prefers outfits that share pieces so the suitcase stays small", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 8 }),
      // B shares nothing with A; C shares the chinos and the loafers.
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-2", shoes_id: "shoes-2", work_score: 8.2 }),
      combo({ id: "C", top_id: "top-2", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 8 }),
    ];
    const result = planPacking(combos, wardrobe(), [
      slot("2026-11-02", "work"),
      slot("2026-11-03", "work"),
    ]);
    const ids = result.slots.map((s) => s.combination?.id).sort();
    expect(ids).toEqual(["A", "C"]);
    expect(result.uses.size).toBe(4);
    expect(result.uses.get("shoes-1")).toBe(2);
  });

  it("does not wear the identical outfit two days running when an alternative exists", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9 }),
      combo({ id: "C", top_id: "top-2", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 8.5 }),
    ];
    const result = planPacking(combos, wardrobe(), [
      slot("2026-11-02", "work"),
      slot("2026-11-03", "work"),
    ]);
    const ids = result.slots.map((s) => s.combination?.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("drops suede shoes on rainy days", () => {
    const combos = [
      combo({ id: "dry", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-2", work_score: 9.5 }),
      combo({ id: "wet-ok", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 7 }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work", 16, true)]);
    expect(result.slots[0].combination?.id).toBe("wet-ok");
  });

  it("respects the season band of the day's temperature", () => {
    const combos = [
      combo({ id: "summer", top_id: "top-3", bottom_id: "bottom-1", shoes_id: "shoes-1", season_suitability: ["summer"], work_score: 9.5 }),
      combo({ id: "cool", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", season_suitability: ["fall", "winter"], work_score: 7 }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work", 8)]);
    expect(result.slots[0].combination?.id).toBe("cool");
  });

  it("keeps to the shoe limit", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", daily_score: 8 }),
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-2", shoes_id: "shoes-2", daily_score: 9.5 }),
      combo({ id: "C", top_id: "top-2", bottom_id: "bottom-2", shoes_id: "shoes-1", daily_score: 7 }),
    ];
    const result = planPacking(
      combos,
      wardrobe(),
      [slot("2026-11-02", "park"), slot("2026-11-03", "park")],
      { maxShoes: 1 },
    );
    const shoes = new Set(result.slots.map((s) => s.combination?.shoes_id));
    expect(shoes.size).toBe(1);
    expect(result.notes).toEqual([]);
  });

  it("excludes pieces the client does not want to pack", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9 }),
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 7 }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work")], {
      excludeItemIds: ["top-1"],
    });
    expect(result.slots[0].combination?.id).toBe("B");
  });

  it("favours a piece the client insists on", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9 }),
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-1", shoes_id: "shoes-1", outerwear_id: "outer-1", work_score: 8 }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work")], {
      requireItemIds: ["outer-1"],
    });
    expect(result.slots[0].combination?.id).toBe("B");
  });

  it("always packs a piece the client insists on when any day can take it", () => {
    const combos = [
      // A on its own is the lightest plan for both days; B is the only outfit with the blazer.
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9 }),
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-2", shoes_id: "shoes-2", outerwear_id: "outer-1", work_score: 7 }),
      combo({ id: "C", top_id: "top-2", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 8.8 }),
    ];
    const result = planPacking(
      combos,
      wardrobe(),
      [slot("2026-11-02", "work"), slot("2026-11-03", "work"), slot("2026-11-04", "work")],
      { requireItemIds: ["outer-1"] },
    );
    expect(result.uses.has("outer-1")).toBe(true);
    expect(result.notes).toEqual([]);
  });

  it("builds a named day around the pieces asked for", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9.5 }),
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-2", shoes_id: "shoes-2", work_score: 7 }),
    ];
    const result = planPacking(combos, wardrobe(), [
      { ...slot("2026-11-02", "work"), requireItemIds: ["top-2", "shoes-2"] },
      slot("2026-11-03", "work"),
    ]);
    expect(result.slots[0].combination?.id).toBe("B");
    expect(result.slots[1].combination?.id).toBe("A");
  });

  it("says when a named piece cannot be worn on that day", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9 }),
      combo({ id: "S", top_id: "top-3", bottom_id: "bottom-1", shoes_id: "shoes-1", season_suitability: ["summer"], work_score: 9 }),
    ];
    const result = planPacking(combos, wardrobe(), [
      { ...slot("2026-11-02", "work", 6), requireItemIds: ["top-3"] },
    ]);
    expect(result.slots[0].combination?.id).toBe("A");
    expect(result.notes[0]).toMatch(/Linen shirt was not worn on 2026-11-02/);
    expect(result.notes).toHaveLength(1);
  });

  it("spreads several named pieces across a day's outfits", () => {
    const combos = [
      combo({ id: "loafers", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 9, daily_score: 8 }),
      combo({ id: "drivers", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-2", work_score: 8.5, daily_score: 8.5 }),
    ];
    const day = "2026-11-02";
    const wanted = ["top-1", "shoes-1", "shoes-2"];
    const result = planPacking(combos, wardrobe(), [
      { ...slot(day, "work"), requireItemIds: wanted },
      { ...slot(day, "dinner"), requireItemIds: wanted },
    ]);
    const shoes = result.slots.map((s) => s.combination?.shoes_id).sort();
    expect(shoes).toEqual(["shoes-1", "shoes-2"]);
    expect(result.notes).toEqual([]);
  });

  it("reports a slot it cannot dress instead of inventing one", () => {
    const combos = [
      combo({ id: "summer", top_id: "top-3", bottom_id: "bottom-1", shoes_id: "shoes-1", season_suitability: ["summer"] }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work", 2)]);
    expect(result.slots[0].combination).toBeNull();
    expect(result.slots[0].fit).toBe("none");
    expect(result.notes[0]).toMatch(/No outfit in the table suits work on 2026-11-02/);
  });

  it("falls back to a lower score floor and says so", () => {
    const combos = [
      combo({ id: "weak", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 6.2, formality_score: 6 }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work")]);
    expect(result.slots[0].combination?.id).toBe("weak");
    expect(result.slots[0].fit).toBe("relaxed");
    expect(result.notes.some((n) => n.includes("score floor"))).toBe(true);
  });

  it("ignores hidden combinations and ones with unknown pieces", () => {
    const combos = [
      combo({ id: "hidden", hidden: true, work_score: 10 }),
      combo({ id: "ghost", top_id: "missing", work_score: 10 }),
      combo({ id: "real", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", work_score: 8 }),
    ];
    const result = planPacking(combos, wardrobe(), [slot("2026-11-02", "work")]);
    expect(result.slots[0].combination?.id).toBe("real");
  });

  it("packs lighter when asked to travel light", () => {
    const combos = [
      combo({ id: "A", top_id: "top-1", bottom_id: "bottom-1", shoes_id: "shoes-1", daily_score: 8 }),
      // B scores a point higher but needs one more piece.
      combo({ id: "B", top_id: "top-2", bottom_id: "bottom-2", shoes_id: "shoes-2", outerwear_id: "outer-1", daily_score: 9 }),
    ];
    const slots = [slot("2026-11-02", "park"), slot("2026-11-04", "park")];
    const normal = planPacking(combos, wardrobe(), slots);
    const light = planPacking(combos, wardrobe(), slots, { travelLight: true });
    expect(normal.uses.size).toBe(4);
    expect(light.uses.size).toBe(3);
  });
});
