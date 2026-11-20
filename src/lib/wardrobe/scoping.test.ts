import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Wardrobe tables may only be queried inside src/lib/wardrobe (docs/adr/0001).
 * Elsewhere a query could rely on row-level security alone, which becomes a
 * leak once linked Family members can view each other's People (1.6.0).
 */
const SRC = join(__dirname, "..", "..");
const TABLES = /\.from\(\s*["'](clothing_items|combinations|daily_plans|shopping_suggestions)["']/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("wardrobe scoping guard", () => {
  it("finds no direct wardrobe-table query outside src/lib/wardrobe", () => {
    const offenders = files(SRC)
      .filter((f) => !relative(SRC, f).startsWith(join("lib", "wardrobe")))
      .filter((f) => TABLES.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
