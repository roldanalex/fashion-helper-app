import type { ClothingItem } from "@/types/database";
import type { Candidate } from "@/lib/combinations/candidates";

/** Compact text descriptor — keeps scoring prompts cheap. */
export function describeItem(item: ClothingItem): string {
  const parts = [
    item.name,
    `${item.color_name ?? "?"} ${item.color_hex ?? ""}`.trim(),
    item.pattern ?? "solid",
    item.material ?? "?",
    `F${item.formality_level ?? "?"}`,
    `OM${item.old_money_score ?? "?"}`,
    item.season?.length ? item.season.join("/") : "all-season",
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
  for (const a of c.accessories) lines.push(`  accessory: ${describeItem(a)}`);
  return lines.join("\n");
}
