"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  CloudRain,
  CloudSun,
  Copy,
  HelpCircle,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTemp, formatTempRange } from "@/lib/units";
import { useUnits } from "@/components/shared/units-provider";
import { CATEGORIES } from "@/lib/constants";
import { useTaxonomy } from "@/i18n/taxonomy";
import type { TripDayPlan, TripItemSummary, TripPlan } from "@/lib/trips/schema";

type Translate = (key: string, values?: Record<string, string | number>) => string;
type FormatDate = (date: string, withYear?: boolean) => string;

/**
 * "Tue 3 Nov" for a YYYY-MM-DD in the viewer's language, independent of their
 * timezone. English keeps the British day-month order.
 */
export function useTripDate(): FormatDate {
  const locale = useLocale();
  const tag = locale === "en" ? "en-GB" : locale;
  return (date, withYear = false) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(tag, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
}

function weatherIcon(w: TripDayPlan["weather"]): LucideIcon {
  if (w.tempC == null) return HelpCircle;
  if ((w.precipProb ?? 0) > 40) return CloudRain;
  if (w.tempC < 8) return Snowflake;
  if (w.tempC >= 23) return Sun;
  return CloudSun;
}

function Swatch({ item, className }: { item: TripItemSummary; className?: string }) {
  return (
    <span
      className={cn("inline-block size-3.5 shrink-0 rounded-[3px] border border-white/15", className)}
      style={{ backgroundColor: item.color_hex ?? "var(--secondary)" }}
      aria-hidden
    />
  );
}

/** Plain-text packing list for the clipboard. */
function packingText(
  plan: TripPlan,
  t: Translate,
  categoryLabel: (category: string) => string,
  formatTripDate: FormatDate,
): string {
  const lines = [
    t("trip.packingHeading", {
      location: plan.location_name,
      start: formatTripDate(plan.start_date),
      end: formatTripDate(plan.end_date),
    }),
    "",
  ];
  for (const category of CATEGORIES) {
    const rows = plan.packing.filter((p) => plan.items[p.item_id]?.category === category);
    if (!rows.length) continue;
    lines.push(categoryLabel(category));
    for (const r of rows) lines.push(`  [ ] ${t("trip.packingLine", { name: plan.items[r.item_id].name, count: r.uses })}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function TripPlanCard({ plan }: { plan: TripPlan }) {
  const { stats } = plan;
  const { units } = useUnits();
  const t = useTranslations("stylist");
  const tx = useTaxonomy();
  const formatTripDate = useTripDate();
  const sameYear = plan.start_date.slice(0, 4) === plan.end_date.slice(0, 4);

  async function copyList() {
    try {
      await navigator.clipboard.writeText(
        packingText(plan, (k, v) => t(k, v), (c) => tx("categoryPlural", c), formatTripDate),
      );
      toast.success(t("trip.copied"));
    } catch {
      toast.error(t("trip.copyFailed"));
    }
  }

  return (
    <section
      className="overflow-hidden rounded-xl border bg-card"
      aria-label={t("trip.ariaLabel", { location: plan.location_name })}
    >
      <header className="border-b px-5 pb-4 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-serif text-2xl leading-tight">{plan.location_name}</h3>
          <p className="text-sm text-muted-foreground">
            {plan.start_date !== plan.end_date
              ? t("trip.dateRange", {
                  start: formatTripDate(plan.start_date, !sameYear),
                  end: formatTripDate(plan.end_date, !sameYear),
                })
              : formatTripDate(plan.start_date, !sameYear)}
          </p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.rich("trip.stats.summary", {
            pieces: stats.distinct_items,
            filled: stats.slots_filled,
            total: stats.slots_total,
            b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
          {stats.outfits < stats.slots_filled && <> {t("trip.stats.distinct", { count: stats.outfits })}</>}
          {" · "}
          {t("trip.stats.shoes", { count: stats.shoes })}
          {stats.outerwear > 0 && <> · {t("trip.stats.outerwear", { count: stats.outerwear })}</>}
          {stats.watches > 0 && <> · {t("trip.stats.watches", { count: stats.watches })}</>}
        </p>
      </header>

      {/* Day by day */}
      <ol className="divide-y">
        {plan.days.map((day) => {
          const Icon = weatherIcon(day.weather);
          const w = day.weather;
          return (
            <li key={day.date} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="font-medium">{formatTripDate(day.date)}</p>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {w.tempC == null ? (
                    t("weather.noForecast")
                  ) : (
                    <>
                      {formatTemp(w.tempC, units)}
                      {w.tempMinC != null && w.tempMaxC != null && (
                        <span className="text-xs"> ({formatTempRange(w.tempMinC, w.tempMaxC, units)})</span>
                      )}
                      {w.precipProb != null && <>, {t("weather.rain", { precip: w.precipProb })}</>}
                      {w.source === "estimate" && <span className="text-xs"> · {t("weather.estimate")}</span>}
                    </>
                  )}
                </p>
              </div>
              <ul className="mt-3 space-y-2.5">
                {day.slots.map((slot, i) => {
                  const items = slot.item_ids
                    .map((id) => plan.items[id])
                    .filter((it): it is TripItemSummary => !!it);
                  return (
                    <li key={`${slot.occasion}-${i}`} className="grid gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
                      <p className="text-sm text-muted-foreground">
                        {tx("occasion", slot.occasion)}
                      </p>
                      {slot.combination_id ? (
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {items.map((it) => (
                              <Link
                                key={it.id}
                                href={`/wardrobe/${it.id}`}
                                className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
                              >
                                <Swatch item={it} />
                                {it.name}
                              </Link>
                            ))}
                            {slot.fit === "relaxed" && (
                              <span className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                                {t("cards.looseFit")}
                              </span>
                            )}
                          </div>
                          {slot.note && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{slot.note}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("trip.nothingSuits")}{" "}
                          <Link href="/shop" className="text-primary underline-offset-4 hover:underline">
                            {t("cards.seeWhatWould")}
                          </Link>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {/* Packing list */}
      {plan.packing.length > 0 && (
        <div className="border-t bg-background/40 px-5 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-serif text-xl">{t("trip.whatToPack")}</h4>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={copyList}>
              <Copy aria-hidden /> {t("trip.copyList")}
            </Button>
          </div>
          <dl className="mt-3 space-y-3">
            {CATEGORIES.map((category) => {
              const rows = plan.packing.filter((p) => plan.items[p.item_id]?.category === category);
              if (!rows.length) return null;
              return (
                <div key={category} className="grid gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
                  <dt className="text-sm text-muted-foreground">
                    {tx("categoryPlural", category)} <span className="text-xs">({rows.length})</span>
                  </dt>
                  <dd className="flex flex-wrap gap-2">
                    {rows.map((r) => {
                      const it = plan.items[r.item_id];
                      return (
                        <Link
                          key={r.item_id}
                          href={`/wardrobe/${r.item_id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-sm transition-colors hover:border-primary/40"
                        >
                          <Swatch item={it} />
                          {it.name}
                          <span className="text-xs text-muted-foreground">
                            <span aria-hidden>×{r.uses}</span>
                            <span className="sr-only">, {t("trip.wornIn", { count: r.uses })}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {plan.notes.length > 0 && (
        <ul className="space-y-1 border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          {plan.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
