"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Check,
  CloudRain,
  CloudSun,
  Loader2,
  RefreshCw,
  Snowflake,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { OutfitCard, type Outfit } from "@/components/today/outfit-card";
import { LocationAutocomplete } from "@/components/today/location-autocomplete";
import { ReadinessBanner } from "@/components/wardrobe/readiness-banner";
import { UnitSwitch } from "@/components/shared/unit-switch";
import { useUnits } from "@/components/shared/units-provider";
import { formatTemp } from "@/lib/units";
import { useTaxonomy } from "@/i18n/taxonomy";
import { occasionsFor } from "@/lib/constants";
import { markWorn } from "@/app/(app)/today/actions";
import type { WardrobeReadiness } from "@/lib/combinations/readiness";
import type { DailyPlan, WeatherSnapshot } from "@/types/database";

interface RecommendationResponse {
  plan: DailyPlan | null;
  weather: WeatherSnapshot | null;
  outfits: Outfit[];
  empty?: boolean;
  cached?: boolean;
  error?: { code: string; message: string };
}

function WeatherChip({ weather }: { weather: WeatherSnapshot }) {
  const { units, setUnits } = useUnits();
  const t = useTranslations("today");
  const Icon =
    weather.precipProb > 40
      ? CloudRain
      : weather.tempC < 8
        ? Snowflake
        : weather.tempC >= 23
          ? Sun
          : CloudSun;
  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-full border bg-card py-1.5 pl-4 pr-1.5 text-sm">
      <span className="inline-flex items-center gap-2">
        <Icon className="size-4 text-primary" aria-hidden />
        <span>
          {t("weather.summary", {
            location: weather.locationName,
            temp: formatTemp(weather.tempC, units),
            condition: (weather.label ?? weather.condition).toLowerCase(),
            precip: weather.precipProb,
          })}
        </span>
      </span>
      <UnitSwitch value={units} onChange={setUnits} size="compact" />
    </div>
  );
}

export function TodayClient({
  personId,
  isMinor,
  familySize,
  hasCombinations,
  readiness,
}: {
  /** The Active person. */
  personId: string;
  isMinor: boolean;
  /** How many People this Account dresses; 2+ shows the Family look card. */
  familySize: number;
  hasCombinations: boolean;
  readiness: WardrobeReadiness;
}) {
  const t = useTranslations("today");
  const tx = useTaxonomy();
  const occasions = occasionsFor(isMinor);
  const [occasion, setOccasion] = useState<string>(isMinor ? "school" : "work");
  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [wornId, setWornId] = useState<string | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  const mutation = useMutation({
    mutationFn: async (force: boolean) => {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          occasion,
          destination,
          notes,
          force,
          destLat: destCoords?.lat,
          destLon: destCoords?.lon,
        }),
      });
      const json: RecommendationResponse = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? t("errors.generic"));
      return json;
    },
    onSuccess: (data) => {
      setResult(data);
      setWornId(null);
      // Bring the picks into view (on phones the form fills the screen) and
      // move focus there so screen readers start at the results.
      requestAnimationFrame(() => {
        resultsHeadingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        resultsHeadingRef.current?.focus({ preventScroll: true });
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function wear(combinationId: string) {
    if (!result?.plan) return;
    const res = await markWorn(result.plan.id, combinationId, personId);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    setWornId(combinationId);
    toast.success(t("worn.toast"));
  }

  if (!hasCombinations) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center rounded-xl border border-dashed py-12 text-center">
          <CloudSun className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-serif text-2xl">{t("empty.title")}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {readiness.ready
              ? t("empty.ready")
              : t("empty.notReady")}
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/wardrobe">{t("empty.goToWardrobe")}</Link>
          </Button>
        </div>
        <ReadinessBanner readiness={readiness} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {familySize > 1 && (
        <Link
          href="/family"
          className="flex min-h-12 items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
        >
          <Users className="size-5 text-primary" aria-hidden />
          <span className="flex-1">
            <span className="font-medium text-foreground">{t("family.title")}</span>{" "}
            <span className="text-muted-foreground">{t("family.body")}</span>
          </span>
        </Link>
      )}
      <section className="rounded-xl border bg-card p-6">
        <ChipGroup
          label={t("form.occasionLabel")}
          options={occasions.map((o) => ({ value: o.value, label: tx("occasion", o.value) }))}
          value={occasion}
          onChange={(v) => setOccasion(v as string)}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="destination">{t("form.whereLabel")}</Label>
            <LocationAutocomplete
              id="destination"
              placeholder={t("form.wherePlaceholder")}
              value={destination}
              onChange={(text) => {
                setDestination(text);
                setDestCoords(null);
              }}
              onSelect={(r) => {
                setDestination(r.label);
                setDestCoords({ lat: r.lat, lon: r.lon });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t("form.notesLabel")}</Label>
            <Textarea
              id="notes"
              className="min-h-9 pointer-coarse:min-h-11"
              rows={1}
              placeholder={
                isMinor
                  ? t("form.notesPlaceholderMinor")
                  : t("form.notesPlaceholder")
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* On phones the main action stays in the thumb zone, just above the tab bar. */}
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 -mx-2 mt-6 rounded-xl bg-background/90 p-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          className="w-full gap-2 md:w-auto"
          size="lg"
          onClick={() => mutation.mutate(false)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("form.submitting")}
            </>
          ) : (
            t("form.submit")
          )}
        </Button>
        </div>
      </section>

      {mutation.isPending && !result && (
        <div className="grid gap-5 xl:grid-cols-2" aria-hidden>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card">
              <div className="flex gap-2 px-5 py-4">
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={j} className="aspect-square w-20 rounded-lg sm:w-24" />
                ))}
              </div>
              <div className="space-y-2 border-t px-5 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {mutation.isPending
          ? t("live.pending")
          : result
            ? result.outfits.length
              ? t("live.ready", { count: result.outfits.length })
              : t("live.none")
            : ""}
      </p>

      {result && (
        <section className="scroll-mt-4 space-y-4" aria-labelledby="picks-heading" aria-busy={mutation.isPending}>
          <h2 id="picks-heading" ref={resultsHeadingRef} tabIndex={-1} className="text-2xl outline-none">
            {t("results.heading")}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {result.weather && <WeatherChip weather={result.weather} />}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => mutation.mutate(true)}
              disabled={mutation.isPending}
            >
              <RefreshCw className="size-4" aria-hidden /> {t("results.fresh")}
            </Button>
          </div>

          {result.outfits.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {t.rich("results.none", {
                  link: (chunks) => (
                    <Link href="/shop" className="ml-1 text-primary underline-offset-4 hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {result.outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.combination.id}
                  outfit={outfit}
                  action={
                    wornId === outfit.combination.id ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                        <Check className="size-4" aria-hidden /> {t("worn.wearing")}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => wear(outfit.combination.id)}
                        disabled={!!wornId}
                      >
                        {t("worn.wearThis")}
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
