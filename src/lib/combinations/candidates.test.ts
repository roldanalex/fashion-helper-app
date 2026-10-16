import { describe, expect, it } from "vitest";
import {
  candidateSeasons,
  generateCandidatesForItem,
  isNeutral,
  pickAccessories,
  pickWatch,
} from "@/lib/combinations/candidates";
import { MAX_ACCESSORIES, MAX_FORMALITY_DELTA } from "@/lib/constants";
import { baseWardrobe, makeItem } from "@/test/fixtures";

describe("isNeutral", () => {
  it("treats grays, navy, white and earth tones as neutral", () => {
    expect(isNeutral("#808080")).toBe(true);
    expect(isNeutral("#1f2a44")).toBe(true); // navy
    expect(isNeutral("#fafafa")).toBe(true);
    expect(isNeutral("#c2a878")).toBe(true); // khaki / tan
  });

  it("treats saturated hues as non-neutral", () => {
    expect(isNeutral("#d7263d")).toBe(false); // red
    expect(isNeutral("#2a9d8f")).toBe(false); // teal
  });

  it("falls back to neutral for missing or malformed colors", () => {
    expect(isNeutral(null)).toBe(true);
    expect(isNeutral("blue")).toBe(true);
  });
});

describe("generateCandidatesForItem", () => {
  it("builds one candidate per top/bottom/shoes tuple when nothing clashes", () => {
    const wardrobe = baseWardrobe();
    const candidates = generateCandidatesForItem(wardrobe[0], wardrobe);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].top.id).toBe("top-1");
    expect(candidates[0].bottom.id).toBe("bottom-1");
    expect(candidates[0].shoes.id).toBe("shoes-1");
    expect(candidates[0].outerwear).toBeNull();
  });

  it("rejects tuples whose formality spread exceeds the limit", () => {
    const wardrobe = baseWardrobe();
    const gymShorts = makeItem({
      id: "bottom-2",
      category: "bottom",
      name: "Gym shorts",
      formality_level: 6 - MAX_FORMALITY_DELTA - 1,
    });
    const candidates = generateCandidatesForItem(gymShorts, [...wardrobe, gymShorts]);
    expect(candidates).toHaveLength(0);
  });

  it("rejects tuples with no shared season", () => {
    const wardrobe = baseWardrobe();
    const linen = makeItem({
      id: "top-2",
      category: "top",
      name: "Linen shirt",
      season: ["summer"],
    });
    const wool = makeItem({
      id: "bottom-2",
      category: "bottom",
      name: "Flannel trousers",
      season: ["winter"],
    });
    const candidates = generateCandidatesForItem(linen, [...wardrobe, linen, wool]);
    // Linen pairs with the all-season chinos, never with the winter-only flannels.
    expect(candidates.every((c) => c.bottom.id !== "bottom-2")).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("ignores unconfirmed and archived pieces", () => {
    const wardrobe = baseWardrobe();
    const pending = makeItem({ id: "top-9", category: "top", ai_status: "tagged" });
    const archived = makeItem({ id: "top-8", category: "top", archived: true });
    const candidates = generateCandidatesForItem(wardrobe[1], [
      ...wardrobe,
      pending,
      archived,
    ]);
    expect(candidates.map((c) => c.top.id)).toEqual(["top-1"]);
  });

  it("adds outerwear as a separate variant, keeping the no-outerwear one", () => {
    const wardrobe = baseWardrobe();
    const blazer = makeItem({ id: "outer-1", category: "outerwear", name: "Navy blazer" });
    const candidates = generateCandidatesForItem(wardrobe[0], [...wardrobe, blazer]);
    expect(candidates.map((c) => c.outerwear?.id ?? null).sort()).toEqual([
      "outer-1",
      null,
    ].sort());
  });

  it("always includes a new accessory and never two of the same type", () => {
    const wardrobe = baseWardrobe();
    const brownBelt = makeItem({
      id: "belt-1",
      category: "accessory",
      subcategory: "belt",
      name: "Brown belt",
    });
    const navyBelt = makeItem({
      id: "belt-2",
      category: "accessory",
      subcategory: "belt",
      name: "Navy belt",
    });
    const candidates = generateCandidatesForItem(navyBelt, [...wardrobe, brownBelt, navyBelt]);
    expect(candidates).toHaveLength(1);
    const ids = candidates[0].accessories.map((a) => a.id);
    expect(ids).toContain("belt-2");
    expect(ids).not.toContain("belt-1");
  });

  it("puts a new watch in the watch slot of every outfit it suits", () => {
    const wardrobe = baseWardrobe();
    const carrera = makeItem({ id: "watch-1", category: "watch", subcategory: "sports" });
    const tudor = makeItem({ id: "watch-2", category: "watch", subcategory: "gmt" });
    const candidates = generateCandidatesForItem(tudor, [...wardrobe, carrera, tudor]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].watch?.id).toBe("watch-2");
    expect(candidates[0].accessories).toEqual([]);
  });

  it("gives other new pieces the best-fitting watch, never a watch as an accessory", () => {
    const wardrobe = baseWardrobe(); // formality 6 throughout
    const diver = makeItem({ id: "diver", category: "watch", subcategory: "diver", formality_level: 5 });
    const sports = makeItem({ id: "sports", category: "watch", subcategory: "sports", formality_level: 6 });
    const candidates = generateCandidatesForItem(wardrobe[0], [...wardrobe, diver, sports]);
    expect(candidates[0].watch?.id).toBe("sports");
    expect(candidates[0].accessories.some((a) => a.category === "watch")).toBe(false);
  });

  it("leaves the watch slot empty when no watch suits the outfit", () => {
    const wardrobe = baseWardrobe();
    const dressWatch = makeItem({
      id: "dress",
      category: "watch",
      subcategory: "dress",
      formality_level: 6 + MAX_FORMALITY_DELTA + 1,
    });
    const candidates = generateCandidatesForItem(wardrobe[0], [...wardrobe, dressWatch]);
    expect(candidates[0].watch).toBeNull();
  });

  it("caps the number of candidates", () => {
    const wardrobe = baseWardrobe();
    const extraTops = Array.from({ length: 6 }, (_, i) =>
      makeItem({ id: `top-x${i}`, category: "top" }),
    );
    const extraBottoms = Array.from({ length: 6 }, (_, i) =>
      makeItem({ id: `bottom-x${i}`, category: "bottom" }),
    );
    const all = [...wardrobe, ...extraTops, ...extraBottoms];
    const candidates = generateCandidatesForItem(wardrobe[2], all, 5);
    expect(candidates).toHaveLength(5);
  });
});

describe("pickAccessories", () => {
  const target = 6;

  it("picks the closest formality first, one per type, up to the cap", () => {
    const pool = [
      makeItem({ id: "belt-far", category: "accessory", subcategory: "belt", formality_level: 8 }),
      makeItem({ id: "belt-near", category: "accessory", subcategory: "belt", formality_level: 6 }),
      makeItem({ id: "shades", category: "accessory", subcategory: "sunglasses", formality_level: 7 }),
      makeItem({ id: "hat", category: "accessory", subcategory: "hat", formality_level: 6 }),
    ];
    const picked = pickAccessories(pool, target, null);
    expect(picked).toHaveLength(MAX_ACCESSORIES);
    expect(picked.map((a) => a.subcategory)).not.toContain(undefined);
    expect(new Set(picked.map((a) => a.subcategory)).size).toBe(picked.length);
    expect(picked.map((a) => a.id)).not.toContain("belt-far");
  });

  it("prefers a buckle that matches the outfit watch's hardware tone", () => {
    const pool = [
      makeItem({
        id: "belt-gold",
        category: "accessory",
        subcategory: "belt",
        formality_level: 6,
        attributes: { hardware_tone: "gold" },
      }),
      makeItem({
        id: "belt-silver",
        category: "accessory",
        subcategory: "belt",
        formality_level: 6,
        attributes: { hardware_tone: "silver" },
      }),
    ];
    const picked = pickAccessories(pool, target, null, MAX_ACCESSORIES, "silver");
    expect(picked.map((a) => a.id)).toEqual(["belt-silver"]);
  });

  it("falls back to a mismatched tone rather than leaving the slot empty", () => {
    const pool = [
      makeItem({
        id: "belt-gold",
        category: "accessory",
        subcategory: "belt",
        attributes: { hardware_tone: "gold" },
      }),
    ];
    const picked = pickAccessories(pool, target, null, MAX_ACCESSORIES, "silver");
    expect(picked.map((a) => a.id)).toEqual(["belt-gold"]);
  });

  it("skips accessories too far from the outfit's formality", () => {
    const pool = [
      makeItem({
        id: "bow-tie",
        category: "accessory",
        subcategory: "hat",
        formality_level: target + MAX_FORMALITY_DELTA + 1,
      }),
    ];
    expect(pickAccessories(pool, target, null)).toEqual([]);
  });
});

describe("candidateSeasons", () => {
  it("returns the intersection of the required pieces' seasons", () => {
    const [top, bottom, shoes] = baseWardrobe();
    top.season = ["spring", "summer"];
    bottom.season = ["summer", "fall"];
    expect(
      candidateSeasons({ top, bottom, shoes, outerwear: null, watch: null, accessories: [] }),
    ).toEqual(["summer"]);
  });
});

describe("pickWatch", () => {
  it("prefers the closest formality, then the higher old-money fit", () => {
    const a = makeItem({ id: "a", category: "watch", formality_level: 7, old_money_score: 7 });
    const b = makeItem({ id: "b", category: "watch", formality_level: 7, old_money_score: 9 });
    const c = makeItem({ id: "c", category: "watch", formality_level: 9, old_money_score: 10 });
    expect(pickWatch([a, b, c], 7)?.id).toBe("b");
  });

  it("returns null for an empty pool", () => {
    expect(pickWatch([], 6)).toBeNull();
  });
});
