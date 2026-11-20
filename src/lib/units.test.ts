import { describe, expect, it } from "vitest";
import {
  cToF,
  defaultUnitsForCountry,
  formatTemp,
  formatTempRange,
  toDisplayTemp,
} from "./units";

describe("units", () => {
  it("converts Celsius to Fahrenheit", () => {
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
    expect(cToF(-40)).toBe(-40);
  });

  it("rounds readings in the chosen unit, not before converting", () => {
    expect(toDisplayTemp(18.4, "metric")).toBe(18);
    expect(toDisplayTemp(18.4, "imperial")).toBe(65);
    expect(toDisplayTemp(17.6, "imperial")).toBe(64);
  });

  it("formats with the unit symbol", () => {
    expect(formatTemp(18, "metric")).toBe("18°C");
    expect(formatTemp(18, "imperial")).toBe("64°F");
    expect(formatTempRange(12, 19, "imperial")).toBe("54–66°");
  });

  it("guesses Fahrenheit for the US and its territories only", () => {
    expect(defaultUnitsForCountry("US")).toBe("imperial");
    expect(defaultUnitsForCountry("pr")).toBe("imperial");
    expect(defaultUnitsForCountry("GB")).toBe("metric");
    expect(defaultUnitsForCountry("PT")).toBe("metric");
    expect(defaultUnitsForCountry(null)).toBe("metric");
  });
});

describe("measure units", () => {
  it("guesses from the country", async () => {
    const { defaultMeasuresForCountry } = await import("@/lib/units");
    expect(defaultMeasuresForCountry("US")).toEqual({ weight: "lb", height: "ftin" });
    expect(defaultMeasuresForCountry("BR")).toEqual({ weight: "kg", height: "cm" });
  });

  it("reads each unit on its own, falling back to the temperature unit for old rows", async () => {
    const { measuresFrom } = await import("@/lib/units");
    expect(measuresFrom({ units: "imperial", weight_unit: "kg", height_unit: null })).toEqual({ weight: "kg", height: "ftin" });
    expect(measuresFrom({ units: "metric" })).toEqual({ weight: "kg", height: "cm" });
    expect(measuresFrom(null)).toEqual({ weight: "kg", height: "cm" });
  });
});
