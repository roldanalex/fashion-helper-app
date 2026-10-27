import { describe, expect, it } from "vitest";
import { expandDateRange, isIsoDate } from "@/lib/trips/dates";

describe("expandDateRange", () => {
  it("lists every day inclusive", () => {
    expect(expandDateRange("2026-11-02", "2026-11-04")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
  });
  it("swaps reversed bounds", () => {
    expect(expandDateRange("2026-11-04", "2026-11-02")).toHaveLength(3);
  });
  it("crosses a month boundary", () => {
    expect(expandDateRange("2026-10-31", "2026-11-01")).toEqual([
      "2026-10-31",
      "2026-11-01",
    ]);
  });
  it("caps very long ranges", () => {
    expect(expandDateRange("2026-01-01", "2026-03-01", 14)).toHaveLength(14);
  });
});

describe("isIsoDate", () => {
  it("accepts YYYY-MM-DD only", () => {
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("2026-13-40")).toBe(false);
    expect(isIsoDate("tomorrow")).toBe(false);
  });
});
