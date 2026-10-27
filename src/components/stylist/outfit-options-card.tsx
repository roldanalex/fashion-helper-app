"use client";

import Link from "next/link";
import { CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTripDate } from "@/lib/trips/dates";
import { OCCASIONS } from "@/lib/constants";
import type { OutfitOptions, TripItemSummary } from "@/lib/trips/schema";

const OCCASION_LABEL = new Map<string, string>(OCCASIONS.map((o) => [o.value, o.label]));

function Swatch({ item }: { item: TripItemSummary }) {
  return (
    <span
      className="inline-block size-3.5 shrink-0 rounded-[3px] border border-white/15"
      style={{ backgroundColor: item.color_hex ?? "var(--secondary)" }}
      aria-hidden
    />
  );
}

export function OutfitOptionsCard({ options }: { options: OutfitOptions }) {
  const w = options.weather;
  const Icon =
    w.tempC == null ? null : (w.precipProb ?? 0) > 40 ? CloudRain : w.tempC < 8 ? Snowflake : w.tempC >= 23 ? Sun : CloudSun;
  const builtAround = options.built_around
    .map((id) => options.items[id])
    .filter((it): it is TripItemSummary => !!it);

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label="Outfit options">
      <header className="border-b px-5 pb-4 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-serif text-2xl leading-tight">
            {OCCASION_LABEL.get(options.occasion) ?? options.occasion}
          </h3>
          {(w.date || w.location_name) && (
            <p className="text-sm text-muted-foreground">
              {w.location_name}
              {w.location_name && w.date && ", "}
              {w.date && formatTripDate(w.date)}
            </p>
          )}
        </div>
        {(Icon || builtAround.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {Icon && w.tempC != null && (
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-4 text-primary" aria-hidden />
                {Math.round(w.tempC)}°C
                {w.precipProb != null && <>, {w.precipProb}% rain</>}
              </span>
            )}
            {builtAround.length > 0 && (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                Built around
                {builtAround.map((it) => (
                  <Link
                    key={it.id}
                    href={`/wardrobe/${it.id}`}
                    className="inline-flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline"
                  >
                    <Swatch item={it} />
                    {it.name}
                  </Link>
                ))}
              </span>
            )}
          </div>
        )}
      </header>

      {options.outfits.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Nothing in your table matches this yet.{" "}
          <Link href="/shop" className="text-primary underline-offset-4 hover:underline">
            See what would
          </Link>
        </p>
      ) : (
        <ol className="divide-y">
          {options.outfits.map((o, i) => {
            const items = o.item_ids
              .map((id) => options.items[id])
              .filter((it): it is TripItemSummary => !!it);
            return (
              <li key={o.combination_id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-xl text-primary">№{i + 1}</span>
                  <Badge variant="secondary">{o.overall_score.toFixed(1)} / 10</Badge>
                  {o.boosted && <Badge className="bg-primary/15 text-primary">Boosted</Badge>}
                  {o.old_money_score != null && o.old_money_score >= 8 && (
                    <Badge className="bg-primary/15 text-primary">Old money</Badge>
                  )}
                  {o.fit === "relaxed" && (
                    <span className="rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground">
                      loose fit
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                </div>
                {o.note && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{o.note}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {options.notes.length > 0 && (
        <ul className="space-y-1 border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          {options.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
