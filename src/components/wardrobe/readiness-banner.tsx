import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RebuildOutfitsButton } from "@/components/wardrobe/rebuild-outfits-button";
import type { WardrobeReadiness } from "@/lib/combinations/readiness";

function Requirement({
  label,
  met,
  optional = false,
}: {
  label: string;
  met: boolean;
  optional?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
        met
          ? "border-primary/40 bg-primary/10 text-primary"
          : optional
            ? "border-dashed border-border text-muted-foreground"
            : "border-border text-muted-foreground",
      )}
      title={optional ? "Optional — adds layers and accessories to outfits" : undefined}
    >
      {met ? (
        <Check className="size-3.5" aria-hidden />
      ) : optional ? (
        <Plus className="size-3.5" aria-hidden />
      ) : (
        <X className="size-3.5" aria-hidden />
      )}
      {label}
    </span>
  );
}

/**
 * Shows the minimum pieces an outfit needs (top + bottom + shoes) and, once
 * met, whether any confirmed pieces still need their outfits built.
 */
export function ReadinessBanner({ readiness }: { readiness: WardrobeReadiness }) {
  const {
    hasTop,
    hasBottom,
    hasShoes,
    hasOuterwear,
    hasAccessory,
    ready,
    pendingCount,
  } = readiness;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Requirement label="Top" met={hasTop} />
        <Requirement label="Bottom" met={hasBottom} />
        <Requirement label="Shoes" met={hasShoes} />
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" aria-hidden />
        <Requirement label="Outerwear" met={hasOuterwear} optional />
        <Requirement label="Accessories" met={hasAccessory} optional />
      </div>

      {!ready ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Confirm at least a top, a bottom and a pair of shoes — that&apos;s the
          minimum the stylist needs before it can weave an outfit. Outfits then
          build automatically as you add each piece.
        </p>
      ) : pendingCount > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {pendingCount} {pendingCount === 1 ? "piece" : "pieces"} still need
            outfits built. This usually happens on its own — tap to finish now.
          </p>
          <RebuildOutfitsButton size="sm" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          You&apos;re set — the stylist has woven outfits from your wardrobe.
          Head to <span className="text-foreground">Today</span> for a
          recommendation.
        </p>
      )}
    </div>
  );
}
