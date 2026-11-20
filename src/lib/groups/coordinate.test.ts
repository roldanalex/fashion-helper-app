import { describe, expect, it } from "vitest";
import { coordinateFamily, type MemberInput } from "@/lib/groups/coordinate";
import { makeCombination, makeItem } from "@/test/fixtures";
import type { ClothingItem, Combination } from "@/types/database";

/** A Person with outfits built from (top colour, bottom colour, formality, score) specs. */
function member(
  personId: string,
  specs: { id: string; top: string; bottom: string; formality?: number; score?: number; shoes?: string; seasons?: string[] }[],
  audience: MemberInput["audience"] = "adult",
): MemberInput {
  const pieces: ClothingItem[] = [];
  const outfits: Combination[] = [];
  for (const s of specs) {
    const top = makeItem({ id: `${s.id}-top`, person_id: personId, category: "top", color_hex: s.top });
    const bottom = makeItem({ id: `${s.id}-bottom`, person_id: personId, category: "bottom", color_hex: s.bottom });
    const shoes = makeItem({
      id: `${s.id}-shoes`,
      person_id: personId,
      category: "shoes",
      material: s.shoes ?? "leather",
      color_hex: "#3b2a1e",
    });
    pieces.push(top, bottom, shoes);
    outfits.push(
      makeCombination({
        id: s.id,
        person_id: personId,
        top_id: top.id,
        bottom_id: bottom.id,
        shoes_id: shoes.id,
        formality_score: s.formality ?? 6,
        daily_score: s.score ?? 8,
        work_score: s.score ?? 8,
        old_money_score: s.score ?? 8,
        overall_score: s.score ?? 8,
        season_suitability: s.seasons ?? ["spring", "summer", "fall", "winter"],
      }),
    );
  }
  return { personId, audience, colorSeason: null, outfits, pieces };
}

const NAVY = "#1f2a44";
const ORANGE = "#e2711d";
const WHITE = "#f4f1ea";
const KHAKI = "#c2a878";

const mild = { tempC: 18, rainy: false };

describe("coordinateFamily", () => {
  it("picks exactly one of each Person's own outfits", () => {
    const a = member("mum", [{ id: "m1", top: NAVY, bottom: KHAKI }]);
    const k = member("kid", [{ id: "k1", top: NAVY, bottom: KHAKI }], "child");
    const { looks } = coordinateFamily({ members: [a, k], occasion: "celebration", weather: mild, mode: "coordinated" });
    expect(looks[0].picks).toEqual([
      { personId: "mum", outfitId: "m1" },
      { personId: "kid", outfitId: "k1" },
    ]);
  });

  it("prefers outfits whose colours work together", () => {
    const a = member("mum", [
      { id: "orange", top: ORANGE, bottom: WHITE },
      { id: "navy", top: NAVY, bottom: KHAKI },
    ]);
    const k = member("kid", [{ id: "k-navy", top: NAVY, bottom: KHAKI }], "child");
    const { looks } = coordinateFamily({ members: [a, k], occasion: "celebration", weather: mild, mode: "coordinated" });
    expect(looks[0].picks.find((p) => p.personId === "mum")?.outfitId).toBe("navy");
  });

  it("keeps adults within a similar level of dress", () => {
    const a = member("mum", [
      { id: "gown", top: NAVY, bottom: NAVY, formality: 10, score: 8.2 },
      { id: "smart", top: NAVY, bottom: KHAKI, formality: 6, score: 8 },
    ]);
    const b = member("dad", [{ id: "chinos", top: WHITE, bottom: KHAKI, formality: 5, score: 8 }]);
    const { looks } = coordinateFamily({ members: [a, b], occasion: "lunch", weather: mild, mode: "coordinated" });
    expect(looks[0].picks.find((p) => p.personId === "mum")?.outfitId).toBe("smart");
  });

  it("reports a Person with nothing suitable and still dresses the rest", () => {
    const a = member("mum", [{ id: "m1", top: NAVY, bottom: KHAKI }]);
    const k = member("kid", [], "child");
    const result = coordinateFamily({ members: [a, k], occasion: "celebration", weather: mild, mode: "relaxed" });
    expect(result.missing).toEqual([{ personId: "kid", reason: "no_outfits" }]);
    expect(result.looseFits).toEqual([]);
    expect(result.looks[0].picks).toEqual([{ personId: "mum", outfitId: "m1" }]);
  });

  it("drops outfits that don't suit the weather", () => {
    const a = member("mum", [
      { id: "suede", top: NAVY, bottom: KHAKI, shoes: "suede", score: 9 },
      { id: "leather", top: NAVY, bottom: KHAKI, shoes: "leather", score: 7.5 },
    ]);
    const { looks } = coordinateFamily({
      members: [a],
      occasion: "park",
      weather: { tempC: 18, rainy: true },
      mode: "relaxed",
    });
    expect(looks[0].picks[0].outfitId).toBe("leather");
  });

  it("says why when nothing suits the weather", () => {
    const a = member("mum", [{ id: "summer", top: WHITE, bottom: KHAKI, seasons: ["summer"] }]);
    const result = coordinateFamily({ members: [a], occasion: "park", weather: { tempC: 0, rainy: false }, mode: "relaxed" });
    expect(result.missing).toEqual([{ personId: "mum", reason: "no_weather_match" }]);
    expect(result.looks).toEqual([]);
  });

  it("returns up to three distinct looks, best first, and is deterministic", () => {
    const a = member("mum", [
      { id: "a1", top: NAVY, bottom: KHAKI, score: 9 },
      { id: "a2", top: WHITE, bottom: NAVY, score: 8.5 },
      { id: "a3", top: ORANGE, bottom: WHITE, score: 8 },
      { id: "a4", top: KHAKI, bottom: NAVY, score: 7.5 },
    ]);
    const k = member("kid", [
      { id: "k1", top: NAVY, bottom: KHAKI },
      { id: "k2", top: WHITE, bottom: NAVY },
    ], "child");
    const input = { members: [a, k], occasion: "celebration" as const, weather: mild, mode: "coordinated" as const };
    const first = coordinateFamily(input);
    expect(first.looks.length).toBe(3);
    const keys = first.looks.map((l) => l.picks.map((p) => p.outfitId).join("+"));
    expect(new Set(keys).size).toBe(3);
    for (let i = 1; i < first.looks.length; i++) {
      expect(first.looks[i - 1].score).toBeGreaterThanOrEqual(first.looks[i].score);
    }
    expect(coordinateFamily(input)).toEqual(first);
  });

  it("gives a family palette from the chosen outfits", () => {
    const a = member("mum", [{ id: "m1", top: NAVY, bottom: KHAKI }]);
    const { looks } = coordinateFamily({ members: [a], occasion: "lunch", weather: mild, mode: "relaxed" });
    expect(looks[0].palette).toEqual(expect.arrayContaining([NAVY, KHAKI]));
  });
});

describe("coordinateFamily: adults in the same colours", () => {
  it("nudges two adults apart when an equally good alternative exists", () => {
    const a = member("mum", [{ id: "m-navy", top: NAVY, bottom: KHAKI }]);
    const b = member("dad", [
      { id: "d-navy", top: NAVY, bottom: KHAKI },
      { id: "d-white", top: WHITE, bottom: NAVY },
    ]);
    const { looks } = coordinateFamily({ members: [a, b], occasion: "lunch", weather: mild, mode: "coordinated" });
    expect(looks[0].picks.find((p) => p.personId === "dad")?.outfitId).toBe("d-white");
  });
});

describe("coordinateFamily: honest about loose fits", () => {
  it("dresses a Person in their closest outfit and says nothing really suits", () => {
    const k = member("kid", [{ id: "pj", top: NAVY, bottom: NAVY, score: 3 }], "child");
    const result = coordinateFamily({ members: [k], occasion: "celebration", weather: mild, mode: "relaxed" });
    expect(result.looks[0].picks[0].outfitId).toBe("pj");
    expect(result.looseFits).toEqual(["kid"]);
  });
});
