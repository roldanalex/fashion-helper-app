"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleBoost, toggleHide } from "@/app/(app)/combinations/actions";
import { FRESHNESS_DAYS } from "@/lib/constants";
import type { ClothingItem, Combination } from "@/types/database";

interface Slot {
  slot: string;
  item: ClothingItem;
  imageUrl?: string;
}

export function ComboCard({
  combination,
  slots,
}: {
  combination: Combination;
  slots: Slot[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const resting =
    combination.last_recommended &&
    Date.now() - new Date(combination.last_recommended).getTime() <
      FRESHNESS_DAYS * 86400_000;

  function update(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-opacity",
        combination.hidden && "opacity-50",
        pending && "opacity-70",
      )}
    >
      <div className="flex items-start gap-1.5 p-3">
        {slots.map(({ item, imageUrl }) => (
          <figure key={item.id} className="w-full min-w-0">
            <div
              className="relative aspect-square overflow-hidden rounded-md border bg-secondary"
              title={item.name}
            >
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={item.name}
                  fill
                  sizes="120px"
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

      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary">{combination.overall_score.toFixed(1)}</Badge>
          {combination.boosted && (
            <Badge className="bg-primary/15 text-primary">Boosted</Badge>
          )}
          {combination.hidden ? (
            <Badge variant="outline">Hidden</Badge>
          ) : resting ? (
            <Badge variant="outline" className="text-muted-foreground">
              Resting
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={combination.boosted ? "Remove boost" : "Boost combination"}
            disabled={pending}
            onClick={() => update(() => toggleBoost(combination.id, !combination.boosted))}
          >
            <Star
              className={cn(
                "size-4",
                combination.boosted
                  ? "fill-primary text-primary"
                  : "text-muted-foreground",
              )}
              aria-hidden
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={combination.hidden ? "Unhide combination" : "Hide combination"}
            disabled={pending}
            onClick={() => update(() => toggleHide(combination.id, !combination.hidden))}
          >
            {combination.hidden ? (
              <Eye className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <EyeOff className="size-4 text-muted-foreground" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      {combination.notes && (
        <p className="border-t px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {combination.notes}
        </p>
      )}
    </article>
  );
}
