import { describe, expect, it } from "vitest";
import { deriveColorSeason, paletteFor } from "@/lib/personal/color-season";
import { colorFit, faceFitBonus, FACE_FIT_WEIGHT, nearFaceColorFit } from "@/lib/personal/face-fit";
import { describeClient, seasonOf } from "@/lib/personal/client-profile";
import { cmToFeetInches, feetInchesToCm, formatHeight, kgToLb, lbToKg } from "@/lib/personal/options";
import { makeCombination, makeItem } from "@/test/fixtures";

describe("deriveColorSeason", () => {
  it("reads warm and light colouring as spring", () => {
    expect(
      deriveColorSeason({ skin_tone: "fair", skin_undertone: "warm", hair_color: "blonde", eye_color: "blue" }),
    ).toBe("spring");
  });

  it("reads warm and deep colouring as autumn", () => {
    expect(
      deriveColorSeason({ skin_tone: "tan", skin_undertone: "warm", hair_color: "dark brown", eye_color: "brown" }),
    ).toBe("autumn");
  });

  it("reads cool and soft colouring as summer", () => {
    expect(
      deriveColorSeason({ skin_tone: "light", skin_undertone: "cool", hair_color: "light brown", eye_color: "gray" }),
    ).toBe("summer");
  });

  it("reads cool, high-contrast colouring as winter", () => {
    expect(
      deriveColorSeason({ skin_tone: "fair", skin_undertone: "cool", hair_color: "black", eye_color: "brown" }),
    ).toBe("winter");
    expect(
      deriveColorSeason({ skin_tone: "deep", skin_undertone: "cool", hair_color: "black", eye_color: "brown" }),
    ).toBe("winter");
  });

  it("uses hair and eyes when the undertone is neutral", () => {
    expect(deriveColorSeason({ skin_undertone: "neutral", skin_tone: "light", hair_color: "red" })).toBe("spring");
    expect(deriveColorSeason({ skin_undertone: "neutral", skin_tone: "medium", hair_color: "gray" })).toBe("summer");
  });

  it("returns null when there is nothing to go on", () => {
    expect(deriveColorSeason({})).toBeNull();
    expect(deriveColorSeason({ skin_tone: "medium" })).toBeNull();
  });
});

describe("colorFit", () => {
  it("rewards palette colours and penalises avoided ones", () => {
    expect(colorFit("#b88a55", "autumn")).toBeGreaterThan(0.5); // camel
    expect(colorFit("#ffffff", "autumn")).toBeLessThan(-0.5); // optic white
    expect(colorFit("#141414", "winter")).toBeGreaterThan(0.5); // black
    expect(colorFit("#111111", "spring")).toBeLessThan(-0.5);
  });

  it("is neutral without a season or a colour", () => {
    expect(colorFit("#b88a55", null)).toBe(0);
    expect(colorFit(null, "autumn")).toBe(0);
    expect(colorFit("not-a-colour", "autumn")).toBe(0);
  });

  it("stays within -1..1", () => {
    for (const hex of ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#808080"]) {
      for (const season of ["spring", "summer", "autumn", "winter"]) {
        const v = colorFit(hex, season);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("nearFaceColorFit", () => {
  const camelTop = makeItem({ id: "camel", color_hex: "#b88a55" });
  const whiteTop = makeItem({ id: "white", color_hex: "#ffffff" });
  const rustJacket = makeItem({ id: "rust", category: "outerwear", color_hex: "#a24d22" });
  const items = new Map([camelTop, whiteTop, rustJacket].map((i) => [i.id, i]));

  it("prefers the flattering top for the client's season", () => {
    const good = makeCombination({ top_id: "camel" });
    const bad = makeCombination({ top_id: "white" });
    expect(nearFaceColorFit(good, items, "autumn")).toBeGreaterThan(nearFaceColorFit(bad, items, "autumn"));
  });

  it("lets a flattering jacket lift an unflattering shirt", () => {
    const bare = makeCombination({ top_id: "white", outerwear_id: null });
    const layered = makeCombination({ top_id: "white", outerwear_id: "rust" });
    expect(nearFaceColorFit(layered, items, "autumn")).toBeGreaterThan(nearFaceColorFit(bare, items, "autumn"));
  });

  it("caps the sort bonus at FACE_FIT_WEIGHT", () => {
    const combo = makeCombination({ top_id: "camel" });
    expect(Math.abs(faceFitBonus(combo, items, "autumn"))).toBeLessThanOrEqual(FACE_FIT_WEIGHT);
    expect(faceFitBonus(combo, items, null)).toBe(0);
  });
});

describe("describeClient", () => {
  it("returns nothing when the client shared nothing", () => {
    expect(describeClient(null)).toBe("");
    expect(describeClient({})).toBe("");
  });

  it("describes build, colouring and season, and never weight", () => {
    const text = describeClient({
      gender: "male",
      age_range: "35-44",
      height_cm: 165,
      body_shape: "athletic",
      skin_tone: "tan",
      skin_undertone: "warm",
      hair_color: "dark brown",
      eye_color: "brown",
      fit_preference: "slim",
      units: "imperial",
      // Weight is not part of PersonalProfile; make sure stray data is not echoed.
      ...({ weight_kg: 90 } as object),
    });
    expect(text).toContain("male, aged 35-44");
    expect(text).toContain("5 ft 5 in");
    expect(text).toContain("athletic build");
    expect(text).toContain("Colour season: Autumn");
    expect(text).toContain("slim, close fit");
    expect(text).not.toMatch(/90|weight|kg|lb/i);
  });

  it("uses the stored season when present", () => {
    expect(seasonOf({ color_season: "winter", skin_undertone: "warm" })).toBe("winter");
    expect(paletteFor(seasonOf({ skin_undertone: "cool", skin_tone: "fair", hair_color: "black" }))?.label).toBe(
      "Winter",
    );
  });

  it("quotes style notes as the client's own words", () => {
    const text = describeClient({ style_notes: 'I prefer to  cover my arms.\nNo "skinny" jeans.' });
    expect(text).toBe(`In their own words: "I prefer to cover my arms. No 'skinny' jeans."`);
  });
});

describe("height and weight conversions", () => {
  it("round-trips feet and inches", () => {
    expect(cmToFeetInches(178)).toEqual({ feet: 5, inches: 10 });
    expect(feetInchesToCm(5, 10)).toBe(178);
    expect(formatHeight(178, "metric")).toBe("178 cm");
    expect(formatHeight(178, "imperial")).toBe("5 ft 10 in");
  });

  it("converts pounds and kilograms", () => {
    expect(kgToLb(75)).toBe(165);
    expect(lbToKg(165)).toBe(75);
  });
});
