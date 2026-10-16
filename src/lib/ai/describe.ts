import type { ClothingItem } from "@/types/database";
import type { Candidate } from "@/lib/combinations/candidates";

/** Watch and accessory details as a short phrase, e.g. "gmt watch, bracelet band, silver hardware". */
export function describeAttributes(item: ClothingItem): string | null {
  const a = item.attributes ?? {};
  const parts: string[] = [];
  if (item.category === "watch") parts.push(`${item.subcategory ?? "?"} watch`);
  if (a.band) parts.push(`${a.band} band`);
  if (a.hardware_tone) parts.push(`${a.hardware_tone} hardware`);
  return parts.length ? parts.join(", ") : null;
}

/** Compact text descriptor — keeps scoring prompts cheap. */
export function describeItem(item: ClothingItem): string {
  const details = describeAttributes(item);
  const parts = [
    item.name,
    `${item.color_name ?? "?"} ${item.color_hex ?? ""}`.trim(),
    item.pattern ?? "solid",
    item.material ?? "?",
    `F${item.formality_level ?? "?"}`,
    `OM${item.old_money_score ?? "?"}`,
    item.season?.length ? item.season.join("/") : "all-season",
    ...(details ? [details] : []),
  ];
  return parts.join(", ");
}

export function describeCandidate(c: Candidate, index: number): string {
  const lines = [
    `[${index}]`,
    `  top: ${describeItem(c.top)}`,
    `  bottom: ${describeItem(c.bottom)}`,
    `  shoes: ${describeItem(c.shoes)}`,
  ];
  if (c.outerwear) lines.push(`  outerwear: ${describeItem(c.outerwear)}`);
  if (c.watch) lines.push(`  watch: ${describeItem(c.watch)}`);
  for (const a of c.accessories) lines.push(`  accessory: ${describeItem(a)}`);
  return lines.join("\n");
}
