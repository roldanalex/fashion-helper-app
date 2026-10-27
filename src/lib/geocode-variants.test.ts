import { describe, expect, it } from "vitest";
import { geocodeVariants } from "@/lib/geocode-variants";

describe("geocodeVariants", () => {
  it("tries a US state reading before the bare city", () => {
    expect(geocodeVariants("San Francisco, CA")).toEqual([
      "San Francisco,CA",
      "San Francisco,CA,US",
      "San Francisco",
    ]);
  });
  it("keeps a plain city as is", () => {
    expect(geocodeVariants("Lisbon")).toEqual(["Lisbon"]);
  });
  it("falls back from a spelled-out region to city and country, then city", () => {
    expect(geocodeVariants("Porto, Norte, Portugal")).toEqual([
      "Porto,Norte,Portugal",
      "Porto,Portugal",
      "Porto",
    ]);
  });
  it("normalises spacing and empty parts", () => {
    expect(geocodeVariants("  Madrid ,, Spain ")).toEqual(["Madrid,Spain", "Madrid"]);
  });
  it("returns nothing for an empty query", () => {
    expect(geocodeVariants(" , ")).toEqual([]);
  });
});
