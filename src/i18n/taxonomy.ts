"use client";

import { useTranslations } from "next-intl";

/** Groups in messages/<locale>/taxonomy.json (generated from src/lib/constants.ts and src/lib/personal/options.ts). */
export type TaxonomyGroup =
  | "category"
  | "categoryPlural"
  | "subcategory"
  | "attribute"
  | "detailLabel"
  | "material"
  | "pattern"
  | "season"
  | "style"
  | "occasion"
  | "lifestyle"
  | "gender"
  | "ageRange"
  | "bodyShape"
  | "skinTone"
  | "undertone"
  | "hairColor"
  | "eyeColor"
  | "fit"
  | "ageBand"
  | "colorSeason";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Display label for a stored value (a category, material, occasion…) in the
 * current language. Unknown values fall back to the value, capitalised.
 *   const tx = useTaxonomy(); tx("material", "linen") → "Lino"
 */
export function useTaxonomy() {
  const t = useTranslations("taxonomy");
  return (group: TaxonomyGroup, value: string | null | undefined): string => {
    if (!value) return "";
    const key = `${group}.${value.replace(/\./g, "_")}`;
    return t.has(key) ? t(key) : cap(value);
  };
}
