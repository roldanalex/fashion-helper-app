"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";
import { Check, Loader2, Sparkles, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { LocationAutocomplete } from "@/components/today/location-autocomplete";
import { PersonInitial } from "@/components/people/person-switcher";
import { useUnits } from "@/components/shared/units-provider";
import { formatTemp } from "@/lib/units";
import { OCCASIONS } from "@/lib/constants";
import { wearFamilyPick } from "@/app/(app)/family/actions";
import type { EnrichedCombination } from "@/lib/combinations/enrich";
import type { WeatherSnapshot } from "@/types/database";

export interface FamilyPersonOption {
  id: string;
  name: string;
  isSelf: boolean;
  isMinor: boolean;
  outfitCount: number;
}

interface LookPerson {
  personId: string;
  name: string;
  alias: string;
  /** Whether this Account may dress them ("Wear this"). */
  editable: boolean;
  outfit: EnrichedCombination;
}

interface LookResponse {
  occasion: string;
  date: string;
  weather: WeatherSnapshot | null;
  looks: { score: number; palette: string[]; note: string; people: LookPerson[] }[];
  missing: { personId: string; name: string; reason: "no_outfits" | "no_weather_match" }[];
  /** Names of people dressed in their closest outfit. */
  looseFits: string[];
  error?: { message: string };
}

/** Labels live under family.modes. */
const MODES = ["coordinated", "matching", "relaxed"] as const;

/** Family-friendly occasions first; work stays out of family looks. */
const FAMILY_OCCASIONS = OCCASIONS.filter((o) => o.value !== "work" && o.value !== "indoors");

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The model only knows aliases ("Child A"); names go back in on screen. */
function withNames(note: string, people: LookPerson[]): string {
  return people.reduce((text, p) => text.replaceAll(p.alias, p.name), note);
}

export function FamilyClient({ people }: { people: FamilyPersonOption[] }) {
  const t = useTranslations("family");
  const tx = useTaxonomy();
  const { units } = useUnits();
  const [chosen, setChosen] = useState<Set<string>>(
    new Set(people.filter((p) => p.outfitCount > 0).map((p) => p.id)),
  );
  const [occasion, setOccasion] = useState("celebration");
  const [mode, setMode] = useState("coordinated");
  const [date, setDate] = useState(localToday());
  const [destination, setDestination] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [result, setResult] = useState<LookResponse | null>(null);
  const [worn, setWorn] = useState<Set<string>>(new Set());
  const resultsRef = useRef<HTMLHeadingElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/family/look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personIds: [...chosen],
          occasion,
          mode,
          date,
          destination: destination || null,
          destLat: coords?.lat ?? null,
          destLon: coords?.lon ?? null,
        }),
      });
      const json: LookResponse = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? t("errors.couldNotPlan"));
      return json;
    },
    onSuccess: (data) => {
      setResult(data);
      setWorn(new Set());
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        resultsRef.current?.focus({ preventScroll: true });
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function wear(p: LookPerson, note: string) {
    if (!result) return;
    const res = await wearFamilyPick({
      personId: p.personId,
      outfitId: p.outfit.combination.id,
      occasion: result.occasion,
      date: result.date,
      today: localToday(),
      note,
    });
    if (res?.error) toast.error(res.error);
    else {
      setWorn((s) => new Set(s).add(`${p.personId}:${p.outfit.combination.id}`));
      toast.success(
        res.worn
          ? t("toast.savedToday", { name: p.name })
          : t("toast.planned", { name: p.name, date: result.date }),
      );
    }
  }

  if (people.length < 2) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed py-14 text-center">
        <Users className="size-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl">{t("empty.title")}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t("empty.description")}
        </p>
        <Button asChild className="mt-6 gap-2">
          <Link href="/settings#people">
            <UserPlus aria-hidden /> {t("empty.addPerson")}
          </Link>
        </Button>
      </div>
    );
  }

  const toggle = (id: string) =>
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-10">
      <section className="space-y-8" aria-labelledby="who-heading">
        <fieldset>
          <legend id="who-heading" className="mb-2 text-sm font-medium">
            {t("form.who")}
          </legend>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.id}>
                <label
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-2 has-[:checked]:border-primary/60 has-[:checked]:bg-primary/5"
                >
                  <Checkbox checked={chosen.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <PersonInitial name={p.name} />
                  <span className="flex-1">
                    {p.name}
                    {p.isSelf && <span className="text-sm text-muted-foreground"> {t("form.you")}</span>}
                  </span>
                  {p.outfitCount === 0 && (
                    <span className="text-xs text-muted-foreground">{t("form.noOutfits")}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <ChipGroup
          label={t("form.occasion")}
          options={FAMILY_OCCASIONS.map((o) => ({ value: o.value, label: tx("occasion", o.value) }))}
          value={occasion}
          onChange={(v) => setOccasion(v as string)}
        />

        <ChipGroup
          label={t("form.mode")}
          options={MODES.map((m) => ({ value: m, label: t(`modes.${m}`) }))}
          value={mode}
          onChange={(v) => setMode(v as string)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="family-date">{t("form.when")}</Label>
            <Input
              id="family-date"
              type="date"
              value={date}
              min={localToday()}
              onChange={(e) => setDate(e.target.value || localToday())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="family-where">{t("form.where")}</Label>
            <LocationAutocomplete
              id="family-where"
              placeholder={t("form.wherePlaceholder")}
              value={destination}
              onChange={(t) => {
                setDestination(t);
                setCoords(null);
              }}
              onSelect={(r) => {
                setDestination(r.label);
                setCoords({ lat: r.lat, lon: r.lon });
              }}
            />
          </div>
        </div>

        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 -mx-2 rounded-xl bg-background/90 p-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <Button
            size="lg"
            className="w-full gap-2 md:w-auto"
            disabled={chosen.size === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> {t("form.dressing")}
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden /> {t("form.plan")}
              </>
            )}
          </Button>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">
        {mutation.isPending
          ? t("status.choosing")
          : result
            ? t("status.ready", { count: result.looks.length })
            : ""}
      </p>

      {mutation.isPending && !result && (
        <div className="space-y-4" aria-hidden>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {result && (
        <section className="scroll-mt-4 space-y-6" aria-labelledby="looks-heading" aria-busy={mutation.isPending}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="looks-heading" ref={resultsRef} tabIndex={-1} className="text-2xl outline-none">
              {t("results.title")}
            </h2>
            {result.weather && (
              <p className="text-sm text-muted-foreground">
                {t("results.weather", {
                  place: result.weather.locationName,
                  temp: formatTemp(result.weather.tempC, units),
                  condition: (result.weather.label ?? result.weather.condition).toLowerCase(),
                  rain: result.weather.precipProb,
                })}
              </p>
            )}
          </div>

          {result.missing.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              {result.missing.map((m) => (
                <li key={m.personId}>
                  {t(`missing.${m.reason}`, { name: m.name })}
                </li>
              ))}
            </ul>
          )}

          {result.looseFits.length > 0 && result.looks.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("results.looseFits", { names: result.looseFits.join(t("results.and")) })}
            </p>
          )}

          {result.looks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("results.none")}
            </p>
          ) : (
            result.looks.map((look, i) => {
              const note = withNames(look.note, look.people);
              return (
                <article key={i} className="overflow-hidden rounded-xl border bg-card">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
                    <h3 className="font-serif text-xl">{t("results.look", { n: i + 1 })}</h3>
                    <ul className="flex gap-1" aria-label={t("results.palette")}>
                      {look.palette.slice(0, 8).map((hex) => (
                        <li
                          key={hex}
                          className="size-5 rounded-full border border-foreground/20"
                          style={{ backgroundColor: hex }}
                          aria-hidden
                        />
                      ))}
                    </ul>
                  </header>
                  <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                    {look.people.map((p) => {
                      const key = `${p.personId}:${p.outfit.combination.id}`;
                      return (
                        <div key={key} className="flex flex-col bg-card p-4">
                          <p className="flex items-center gap-2 font-medium">
                            <PersonInitial name={p.name} className="size-6 text-xs" />
                            {p.name}
                          </p>
                          <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label={t("results.outfitOf", { name: p.name })}>
                            {p.outfit.slots.map((s) => (
                              <li key={s.item.id} className="w-16 shrink-0">
                                <div className="relative aspect-square overflow-hidden rounded-md border bg-secondary">
                                  {s.imageUrl && (
                                    <Image src={s.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 text-center text-xs leading-tight text-muted-foreground">
                                  {s.item.name}
                                </p>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-auto pt-3">
                            {!p.editable ? (
                              <span className="text-sm text-muted-foreground">{t("results.choosesOwn", { name: p.name })}</span>
                            ) : worn.has(key) ? (
                              <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                                <Check className="size-4" aria-hidden /> {t("results.plannedFor", { name: p.name })}
                              </span>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => wear(p, note)}>
                                {t("results.wear")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {note && (
                    <p className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground">{note}</p>
                  )}
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
