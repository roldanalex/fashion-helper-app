import { describe, expect, it } from "vitest";
import {
  ACCESSORY_DETAILS,
  CATEGORIES,
  MATERIALS,
  OCCASIONS,
  OCCASION_HINTS,
  OCCASION_WEIGHTS,
  RECO_MAX_PICKS,
  RECO_MIN_PICKS,
  RECO_CANDIDATE_POOL,
  SUBCATEGORIES,
} from "@/lib/constants";

describe("occasions", () => {
  it("every occasion has weights that sum to 1 and a stylist hint", () => {
    for (const { value } of OCCASIONS) {
      const w = OCCASION_WEIGHTS[value];
      const sum = w.work + w.daily + w.formality + w.oldMoney;
      expect(sum, `${value} weights`).toBeCloseTo(1, 6);
      expect(OCCASION_HINTS[value], `${value} hint`).toMatch(/\S/);
    }
  });

  it("includes the conference and lunch occasions", () => {
    const values = OCCASIONS.map((o) => o.value);
    expect(values).toContain("indoors");
    expect(values).toContain("lunch");
  });

  it("has unique occasion values", () => {
    const values = OCCASIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("wardrobe taxonomy", () => {
  it("defines subcategories for every category", () => {
    for (const category of CATEGORIES) {
      expect(SUBCATEGORIES[category].length).toBeGreaterThan(0);
    }
  });

  it("only attaches accessory details to real accessory types", () => {
    for (const type of Object.keys(ACCESSORY_DETAILS)) {
      expect(SUBCATEGORIES.accessory).toContain(type);
    }
  });

  it("includes metals for watches", () => {
    expect(MATERIALS).toContain("steel");
    expect(MATERIALS).toContain("gold");
  });
});

describe("recommendation tuning", () => {
  it("asks for a sane number of picks from a larger pool", () => {
    expect(RECO_MIN_PICKS).toBeLessThanOrEqual(RECO_MAX_PICKS);
    expect(RECO_MAX_PICKS).toBeLessThanOrEqual(RECO_CANDIDATE_POOL);
  });
});
