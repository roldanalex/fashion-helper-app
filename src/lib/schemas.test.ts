import { describe, expect, it } from "vitest";
import { itemTagsSchema, rerankSchema } from "@/lib/schemas";
import { RECO_MAX_PICKS } from "@/lib/constants";

const watch = {
  name: "Tudor Black Bay GMT",
  category: "watch",
  subcategory: "gmt",
  color_name: "black",
  color_hex: "#111111",
  pattern: "solid",
  material: "steel",
  season: ["spring", "summer", "fall", "winter"],
  formality_level: 6,
  old_money_score: 7,
  attributes: { band: "bracelet", hardware_tone: "silver" },
};

describe("itemTagsSchema", () => {
  it("accepts a fully tagged watch", () => {
    expect(itemTagsSchema.safeParse(watch).success).toBe(true);
  });

  it("accepts null accessory details for ordinary clothing", () => {
    const polo = {
      ...watch,
      category: "top",
      subcategory: "polo",
      material: "pique",
      attributes: { band: null, hardware_tone: null },
    };
    expect(itemTagsSchema.safeParse(polo).success).toBe(true);
  });

  it("rejects unknown materials, bad hex and out-of-range scores", () => {
    expect(itemTagsSchema.safeParse({ ...watch, material: "plastic" }).success).toBe(false);
    expect(itemTagsSchema.safeParse({ ...watch, color_hex: "black" }).success).toBe(false);
    expect(itemTagsSchema.safeParse({ ...watch, formality_level: 11 }).success).toBe(false);
  });

  it("rejects unknown watch bands", () => {
    const bad = { ...watch, attributes: { ...watch.attributes, band: "velcro" } };
    expect(itemTagsSchema.safeParse(bad).success).toBe(false);
  });
});

describe("rerankSchema", () => {
  const pick = (i: number) => ({
    combination_id: `c${i}`,
    rank: i,
    watch_id: null,
    accessory_ids: [],
    explanation: "Two sentences. About the day.",
  });

  it("accepts up to the configured maximum number of picks", () => {
    const picks = Array.from({ length: RECO_MAX_PICKS }, (_, i) => pick(i + 1));
    expect(rerankSchema.safeParse({ picks }).success).toBe(true);
  });

  it("rejects more picks than the maximum and an empty list", () => {
    const tooMany = Array.from({ length: RECO_MAX_PICKS + 1 }, (_, i) => pick(i + 1));
    expect(rerankSchema.safeParse({ picks: tooMany }).success).toBe(false);
    expect(rerankSchema.safeParse({ picks: [] }).success).toBe(false);
  });
});
