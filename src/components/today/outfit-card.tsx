"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ClothingItem, Combination } from "@/types/database";

export interface OutfitSlot {
  slot: string;
  item: ClothingItem;
  imageUrl?: string;
}

export interface Outfit {
  combination: Combination;
  slots: OutfitSlot[];
  rank: number;
  explanation: string;
}

export function OutfitCard({
  outfit,
  action,
}: {
  outfit: Outfit;
  action?: React.ReactNode;
}) {
  const { combination, slots, rank, explanation } = outfit;

  return (
    <article className="overflow-hidden rounded-xl border bg-card transition-colors duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl text-primary">№{rank}</span>
          <Badge variant="secondary">{combination.overall_score.toFixed(1)} / 10</Badge>
          {combination.old_money_score != null &&
            combination.old_money_score >= 8 && (
              <Badge className="bg-primary/15 text-primary">Old money</Badge>
            )}
        </div>
        {action}
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 py-4">
        {slots.map(({ item, imageUrl }) => (
          <figure key={item.id} className="w-20 shrink-0 sm:w-24" title={item.name}>
            <div className="relative aspect-square overflow-hidden rounded-lg border bg-secondary">
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>
            <figcaption className="mt-1 line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">
              {item.name}
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        {explanation}
      </p>
    </article>
  );
}
