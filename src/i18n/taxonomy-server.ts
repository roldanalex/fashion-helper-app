import "server-only";
import { getTranslations } from "next-intl/server";
import type { TaxonomyGroup } from "@/i18n/taxonomy";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Server-side twin of useTaxonomy(). */
export async function getTaxonomy() {
  const t = await getTranslations("taxonomy");
  return (group: TaxonomyGroup, value: string | null | undefined): string => {
    if (!value) return "";
    const key = `${group}.${value.replace(/\./g, "_")}`;
    return t.has(key) ? t(key) : cap(value);
  };
}
