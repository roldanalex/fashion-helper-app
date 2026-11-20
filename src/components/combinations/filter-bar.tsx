"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OCCASIONS, SEASONS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";

export interface ItemOption {
  id: string;
  name: string;
}

/** Query keys the bar owns; "show" (pagination) resets whenever a filter changes. */
const FILTER_KEYS = [
  "top",
  "bottom",
  "shoes",
  "outerwear",
  "watch",
  "accessory",
  "occasion",
  "season",
  "min",
  "hidden",
] as const;

export function FilterBar({
  tops = [],
  bottoms = [],
  shoes = [],
  outerwear = [],
  watches = [],
  accessories = [],
}: {
  tops?: ItemOption[];
  bottoms?: ItemOption[];
  shoes?: ItemOption[];
  outerwear?: ItemOption[];
  watches?: ItemOption[];
  accessories?: ItemOption[];
}) {
  const t = useTranslations("outfits.filters");
  const tx = useTaxonomy();
  const router = useRouter();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.delete("show");
    router.replace(`/combinations?${next.toString()}`, { scroll: false });
  }

  function clearAll() {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((k) => next.delete(k));
    next.delete("show");
    router.replace(`/combinations?${next.toString()}`, { scroll: false });
  }

  const itemFilters: { key: string; label: string; options: ItemOption[] }[] = [
    { key: "top", label: t("slot.top"), options: tops },
    { key: "bottom", label: t("slot.bottom"), options: bottoms },
    { key: "shoes", label: t("slot.shoes"), options: shoes },
    { key: "outerwear", label: t("slot.outerwear"), options: outerwear },
    { key: "watch", label: t("slot.watch"), options: watches },
    { key: "accessory", label: t("slot.accessory"), options: accessories },
  ];

  // Active filters as removable chips (the default score 7+ is not a filter).
  const active: { key: string; label: string }[] = [];
  for (const f of itemFilters) {
    const id = params.get(f.key);
    const name = id && f.options.find((o) => o.id === id)?.name;
    if (name) active.push({ key: f.key, label: name });
  }
  const occ = params.get("occasion");
  if (occ) active.push({ key: "occasion", label: tx("occasion", occ) });
  const season = params.get("season");
  if (season) active.push({ key: "season", label: tx("season", season) });
  const min = params.get("min");
  if (min && min !== "7") active.push({ key: "min", label: t("scoreMin", { min }) });
  if (params.get("hidden") === "1") active.push({ key: "hidden", label: t("includingHidden") });

  /** The controls themselves; stacked full-width in the sheet, inline on desktop. */
  const controls = (stacked: boolean) => (
    <div className={cn(stacked ? "flex flex-col gap-5" : "flex flex-wrap items-center gap-3")}>
      {stacked && <p className="text-sm font-medium">{t("buildAround")}</p>}
      {itemFilters.map(
        ({ key, label, options }) =>
          options.length > 0 && (
            <Select key={key} value={params.get(key) ?? "all"} onValueChange={(v) => setParam(key, v)}>
              <SelectTrigger className={stacked ? "w-full" : "w-44"} aria-label={t("filterBy", { label })}>
                <SelectValue placeholder={t("any", { label })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("any", { label })}</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
      )}

      {stacked && <p className="pt-2 text-sm font-medium">{t("occasionSeasonScore")}</p>}
      <Select value={params.get("occasion") ?? "all"} onValueChange={(v) => setParam("occasion", v)}>
        <SelectTrigger className={stacked ? "w-full" : "w-40"} aria-label={t("filterByOccasion")}>
          <SelectValue placeholder={t("occasion")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyOccasion")}</SelectItem>
          {OCCASIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {tx("occasion", o.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("season") ?? "all"} onValueChange={(v) => setParam("season", v)}>
        <SelectTrigger className={stacked ? "w-full" : "w-36"} aria-label={t("filterBySeason")}>
          <SelectValue placeholder={t("season")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anySeason")}</SelectItem>
          {SEASONS.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {tx("season", s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("min") ?? "7"} onValueChange={(v) => setParam("min", v)}>
        <SelectTrigger className={stacked ? "w-full" : "w-32"} aria-label={t("minimumScore")}>
          <SelectValue placeholder={t("score")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">{t("scoreMin", { min: 7 })}</SelectItem>
          <SelectItem value="8">{t("scoreMin", { min: 8 })}</SelectItem>
          <SelectItem value="9">{t("scoreMin", { min: 9 })}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex min-h-11 items-center gap-3">
        <Switch
          id={stacked ? "show-hidden-sheet" : "show-hidden"}
          checked={params.get("hidden") === "1"}
          onCheckedChange={(v) => setParam("hidden", v ? "1" : "")}
        />
        <Label htmlFor={stacked ? "show-hidden-sheet" : "show-hidden"} className="text-sm text-muted-foreground">
          {t("showHidden")}
        </Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Mobile: one button opens the filters; the results stay in view. */}
      <div className="md:hidden">
        <Button variant="outline" className="gap-2" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
          <SlidersHorizontal aria-hidden />
          {active.length > 0 ? t("filtersCount", { count: active.length }) : t("filters")}
        </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="pb-0">
              <SheetTitle className="font-serif text-xl">{t("sheetTitle")}</SheetTitle>
              <SheetDescription>{t("sheetDescription")}</SheetDescription>
            </SheetHeader>
            <div className="px-4">{controls(true)}</div>
            <div className="sticky bottom-0 flex gap-2 border-t bg-popover p-4">
              <Button variant="ghost" className="flex-1" onClick={clearAll} disabled={active.length === 0}>
                {t("clearAll")}
              </Button>
              <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                {t("showOutfits")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: inline controls. */}
      <div className="hidden md:block">{controls(false)}</div>

      {active.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("activeFilters")}>
          {active.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => setParam(f.key, "")}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-sm text-primary transition-colors hover:bg-primary/20 pointer-coarse:min-h-11"
              >
                {f.label}
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">{t("removeFilter")}</span>
              </button>
            </li>
          ))}
          {active.length > 1 && (
            <li>
              <button
                type="button"
                onClick={clearAll}
                className="min-h-9 cursor-pointer px-2 text-sm text-muted-foreground underline-offset-4 hover:underline pointer-coarse:min-h-11"
              >
                {t("clearAll")}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
