"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  CloudRain,
  CloudSun,
  Loader2,
  RefreshCw,
  Snowflake,
  Sun,
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
import { OCCASIONS } from "@/lib/constants";
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
          {weather.locationName}: {formatTemp(weather.tempC, units)},{" "}
          {weather.condition.toLowerCase()}, {weather.precipProb}% rain
        </span>
      </span>
      <UnitSwitch value={units} onChange={setUnits} size="compact" />
    </div>
  );
}

export function TodayClient({
  hasCombinations,
  readiness,
}: {
  hasCombinations: boolean;
  readiness: WardrobeReadiness;
}) {
  const [occasion, setOccasion] = useState<string>("work");
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
          occasion,
          destination,
          notes,
          force,
          destLat: destCoords?.lat,
          destLon: destCoords?.lon,
        }),
      });
      const json: RecommendationResponse = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Something went wrong");
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
    const res = await markWorn(result.plan.id, combinationId);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    setWornId(combinationId);
    toast.success("Noted — wear it well");
  }

  if (!hasCombinations) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center rounded-xl border border-dashed py-12 text-center">
          <CloudSun className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-serif text-2xl">No outfits yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {readiness.ready
              ? "Your pieces are in — the stylist just needs to weave them into outfits."
              : "The stylist builds outfits automatically once your wardrobe has the essentials below."}
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/wardrobe">Go to wardrobe</Link>
          </Button>
        </div>
        <ReadinessBanner readiness={readiness} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-card p-6">
        <ChipGroup
          label="What does today hold?"
          options={OCCASIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={occasion}
          onChange={(v) => setOccasion(v as string)}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="destination">Where? (optional)</Label>
            <LocationAutocomplete
              id="destination"
              placeholder="Home, or start typing a city"
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
            <Label htmlFor="notes">Anything else? (optional)</Label>
            <Textarea
              id="notes"
              className="min-h-9 pointer-coarse:min-h-11"
              rows={1}
              placeholder="e.g. client meeting, then lunch with the kids"
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
              Checking the weather…
            </>
          ) : (
            "Style my day"
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
          ? "Checking the weather and choosing outfits."
          : result
            ? result.outfits.length
              ? `${result.outfits.length} outfits ready.`
              : "No outfit in your table fits this day."
            : ""}
      </p>

      {result && (
        <section className="scroll-mt-4 space-y-4" aria-labelledby="picks-heading" aria-busy={mutation.isPending}>
          <h2 id="picks-heading" ref={resultsHeadingRef} tabIndex={-1} className="text-2xl outline-none">
            Today&apos;s picks
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
              <RefreshCw className="size-4" aria-hidden /> Fresh suggestions
            </Button>
          </div>

          {result.outfits.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing in your table quite fits this day and weather. A few
                new pieces would open things up —
                <Link href="/shop" className="ml-1 text-primary underline-offset-4 hover:underline">
                  see what to buy next
                </Link>
                .
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
                        <Check className="size-4" aria-hidden /> Wearing it
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => wear(outfit.combination.id)}
                        disabled={!!wornId}
                      >
                        I&apos;ll wear this
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
