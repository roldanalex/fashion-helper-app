import { describe, expect, it } from "vitest";
import { openWardrobe } from "@/lib/wardrobe";
import { memoryStore } from "@/lib/wardrobe/memory";
import { makeCombination, makeItem } from "@/test/fixtures";

/** Two People in one store: an adult and a child. */
function family() {
  const store = memoryStore({
    pieces: [
      makeItem({ id: "a-top", person_id: "adult", category: "top" }),
      makeItem({ id: "a-bottom", person_id: "adult", category: "bottom" }),
      makeItem({ id: "a-shoes", person_id: "adult", category: "shoes", wear_count: 2 }),
      makeItem({ id: "a-old", person_id: "adult", category: "top", archived: true }),
      makeItem({ id: "k-top", person_id: "kid", category: "top" }),
      makeItem({ id: "k-bottom", person_id: "kid", category: "bottom" }),
      makeItem({ id: "k-shoes", person_id: "kid", category: "shoes" }),
    ],
    outfits: [
      makeCombination({ id: "a1", person_id: "adult", top_id: "a-top", bottom_id: "a-bottom", shoes_id: "a-shoes" }),
      makeCombination({ id: "a2", person_id: "adult", top_id: "a-old", bottom_id: "a-bottom", shoes_id: "a-shoes", overall_score: 9 }),
      makeCombination({ id: "k1", person_id: "kid", top_id: "k-top", bottom_id: "k-bottom", shoes_id: "k-shoes" }),
    ],
  });
  return {
    store,
    adult: openWardrobe(store, { personId: "adult", accountId: "acct" }),
    kid: openWardrobe(store, { personId: "kid", accountId: "acct" }),
  };
}

describe("Wardrobe scoping", () => {
  it("lists only the Person's own pieces and outfits", async () => {
    const { adult, kid } = family();
    expect((await kid.pieces()).map((p) => p.id).sort()).toEqual(["k-bottom", "k-shoes", "k-top"]);
    expect((await kid.outfits()).map((o) => o.id)).toEqual(["k1"]);
    expect((await adult.outfits()).map((o) => o.id)).toEqual(["a1"]);
  });

  it("refuses another Person's ids", async () => {
    const { kid } = family();
    expect(await kid.piece("a-top")).toBeNull();
    expect(await kid.outfitsByIds(["a1", "k1"])).toHaveLength(1);
    expect(await kid.updatePiece("a-top", { name: "Hijacked" })).toBe(false);
    expect(await kid.updateOutfit("a1", { hidden: true })).toBe(false);
  });

  it("still finds the Person's own archived piece by id", async () => {
    const { adult } = family();
    expect((await adult.piece("a-old"))?.archived).toBe(true);
  });

  it("never returns an outfit that contains an archived piece", async () => {
    const { adult } = family();
    expect((await adult.outfits()).some((o) => o.id === "a2")).toBe(false);
    expect(await adult.outfitsByIds(["a2"])).toEqual([]);
  });

  it("refuses to store an outfit that mixes People", async () => {
    const { kid } = family();
    await expect(
      kid.addOutfits([
        {
          ...makeCombination({ top_id: "a-top", bottom_id: "k-bottom", shoes_id: "k-shoes" }),
        },
      ]),
    ).rejects.toThrow(/same person/);
  });
});

describe("Wardrobe plans and wear", () => {
  it("keeps separate plans per Person for the same day and occasion", async () => {
    const { adult, kid } = family();
    const base = {
      plan_date: "2026-11-20",
      occasion: "celebration",
      destination: null,
      dest_lat: null,
      dest_lon: null,
      notes: null,
      weather: null,
      recommendations: [],
    };
    await adult.savePlan(base);
    await kid.savePlan(base);
    expect(await adult.plan("2026-11-20", "celebration")).not.toBeNull();
    expect(await kid.plan("2026-11-20", "celebration")).not.toBeNull();
    expect((await adult.plan("2026-11-20", "celebration"))?.id).not.toBe(
      (await kid.plan("2026-11-20", "celebration"))?.id,
    );
  });

  it("records wear on the Person's pieces and rests the outfit", async () => {
    const { adult, store } = family();
    const plan = await adult.savePlan({
      plan_date: "2026-11-20",
      occasion: "work",
      destination: null,
      dest_lat: null,
      dest_lon: null,
      notes: null,
      weather: null,
      recommendations: [{ combination_id: "a1", rank: 1, explanation: "" }],
    });
    expect(await adult.recordWorn(plan!.id, "a1")).toBe(true);
    expect(store.state.pieces.find((p) => p.id === "a-shoes")?.wear_count).toBe(3);
    expect(store.state.outfits.find((o) => o.id === "a1")?.last_recommended).not.toBeNull();
  });

  it("will not record another Person's outfit", async () => {
    const { adult, kid } = family();
    const plan = await kid.savePlan({
      plan_date: "2026-11-20",
      occasion: "school",
      destination: null,
      dest_lat: null,
      dest_lon: null,
      notes: null,
      weather: null,
      recommendations: [],
    });
    expect(await kid.recordWorn(plan!.id, "a1")).toBe(false);
    expect(await adult.recordWorn(plan!.id, "a1")).toBe(false);
  });
});
