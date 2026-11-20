import { Check, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("wardrobe.readiness");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
        met
          ? "border-primary/40 bg-primary/10 text-primary"
          : optional
            ? "border-dashed border-input text-muted-foreground"
            : "border-input text-muted-foreground",
      )}
    >
      {met ? (
        <Check className="size-3.5" aria-hidden />
      ) : optional ? (
        <Plus className="size-3.5" aria-hidden />
      ) : (
        <X className="size-3.5" aria-hidden />
      )}
      {label}
      <span className="sr-only">
        {met ? t("srMet") : optional ? t("srOptional") : t("srMissing")}
      </span>
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
    hasWatch,
    hasAccessory,
    ready,
    pendingCount,
  } = readiness;
  const t = useTranslations("wardrobe.readiness");

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Requirement label={t("top")} met={hasTop} />
        <Requirement label={t("bottom")} met={hasBottom} />
        <Requirement label={t("shoes")} met={hasShoes} />
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" aria-hidden />
        <Requirement label={t("outerwear")} met={hasOuterwear} optional />
        <Requirement label={t("watch")} met={hasWatch} optional />
        <Requirement label={t("accessories")} met={hasAccessory} optional />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("requiredNote")}
      </p>

      {!ready ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("notReady")}
        </p>
      ) : pendingCount > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("pending", { count: pendingCount })}
          </p>
          <RebuildOutfitsButton size="sm" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {t.rich("ready", {
            b: (chunks) => <span className="text-foreground">{chunks}</span>,
          })}
        </p>
      )}
    </div>
  );
}
