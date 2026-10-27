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
