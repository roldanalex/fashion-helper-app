"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useValidationMessage } from "@/i18n/validation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ChipGroup } from "@/components/onboarding/chip-group";
import {
  BuildFields,
  ColoringFields,
  StyleNotesField,
  type PersonalDraft,
} from "@/components/personal/personal-fields";
import { LocationAutocomplete } from "@/components/today/location-autocomplete";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { useTaxonomy } from "@/i18n/taxonomy";
import { profileSchema, type ProfileInput } from "@/lib/schemas";
import type { Units } from "@/lib/units";
import { useOnboardingStore } from "@/stores/onboarding";
import { saveProfile } from "@/app/onboarding/actions";

/** `title` is a key under onboarding.steps. */
const STEPS = [
  { title: "about", optional: true },
  { title: "coloring", optional: true },
  { title: "style", optional: false },
  { title: "home", optional: false },
] as const;

const stepFields: (keyof ProfileInput)[][] = [
  ["gender", "age_range", "height_cm", "weight_kg", "body_shape", "fit_preference"],
  ["skin_tone", "skin_undertone", "hair_color", "eye_color"],
  ["preferred_formality", "style_preferences", "lifestyle_tags", "style_notes"],
  ["home_location"],
];

const LIFESTYLE_TAGS = [
  "office",
  "remote work",
  "parent",
  "travel often",
  "gym",
  "social events",
];

/** First guess for measurement units; the user can flip it on the step. */
function guessUnits(): Units {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region === "US" || region === "LR" || region === "MM" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function OnboardingWizard() {
  const t = useTranslations("onboarding");
  const vmsg = useValidationMessage();
  const tc = useTranslations("common");
  const tx = useTaxonomy();
  const { draft, step, set, setStep } = useOnboardingStore();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Units>("metric");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => setUnits(guessUnits()), []);

  // Move focus to the new step's heading so screen readers start there.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const setPersonal = (fields: PersonalDraft) => set(fields as Partial<ProfileInput>);

  function validateStep(): boolean {
    const fields = stepFields[step];
    const partial = profileSchema.pick(
      Object.fromEntries(fields.map((f) => [f, true])) as Record<
        keyof ProfileInput,
        true
      >,
    );
    const result = partial.safeParse(draft);
    if (!result.success) {
      setError(vmsg(result.error.issues[0]?.message, t("errors.completeStep")));
      return false;
    }
    setError(null);
    return true;
  }

  function goTo(nextStep: number) {
    setError(null);
    setStep(nextStep);
  }

  function next() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    const result = profileSchema.safeParse(draft);
    if (!result.success) {
      setError(vmsg(result.error.issues[0]?.message, t("errors.somethingMissing")));
      return;
    }
    startTransition(async () => {
      const res = await saveProfile(
        result.data,
        units === "imperial" ? { weight: "lb", height: "ftin" } : { weight: "kg", height: "cm" },
      );
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        useOnboardingStore.persist.clearStorage();
      }
    });
  }

  /** Skip an optional step: clear its answers so nothing half-entered is saved. */
  function skip() {
    const cleared = Object.fromEntries(stepFields[step].map((f) => [f, null]));
    set(cleared as Partial<ProfileInput>);
    goTo(step + 1);
  }

  const current = STEPS[step];

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10 md:py-12">
      <p className="text-sm text-primary">
        {t("stepOf", { step: step + 1, total: STEPS.length })}
        {current.optional && t("optionalSuffix")}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-4xl outline-none">
        {t(`steps.${current.title}`)}
      </h1>
      <Progress
        value={((step + 1) / STEPS.length) * 100}
        className="mt-6 h-1"
        aria-label={t("progressLabel")}
      />

      {step < 2 && (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("privacy")}
        </p>
      )}

      <div className="mt-8 space-y-8">
        {step === 0 && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("measureIn")}</span>
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={units === u}
                  onClick={() => setUnits(u)}
                  className={
                    units === u
                      ? "min-h-9 cursor-pointer rounded-full border border-primary bg-primary/15 px-3 text-primary pointer-coarse:min-h-11"
                      : "min-h-9 cursor-pointer rounded-full border border-input px-3 text-muted-foreground pointer-coarse:min-h-11"
                  }
                >
                  {u === "metric" ? t("metricUnits") : t("imperialUnits")}
                </button>
              ))}
            </div>
            <BuildFields
              key={units}
              draft={draft}
              set={setPersonal}
              measures={units === "imperial" ? { weight: "lb", height: "ftin" } : { weight: "kg", height: "cm" }}
            />
          </>
        )}

        {step === 1 && <ColoringFields draft={draft} set={setPersonal} />}

        {step === 2 && (
          <>
            <ChipGroup
              label={t("stylesLabel")}
              options={STYLE_PREFERENCES.map((s) => ({ value: s.value, label: tx("style", s.value) }))}
              value={draft.style_preferences}
              onChange={(v) => set({ style_preferences: v as string[] })}
              multiple
            />
            <div>
              <Label id="formality-label" className="text-sm font-medium">
                {t("formalityLabel", { value: draft.preferred_formality ?? 5 })}
              </Label>
              <Slider
                className="mt-4"
                min={1}
                max={10}
                step={1}
                value={[draft.preferred_formality ?? 5]}
                onValueChange={([v]) => set({ preferred_formality: v })}
                aria-labelledby="formality-label"
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground" aria-hidden>
                <span>{t("relaxed")}</span>
                <span>{t("polished")}</span>
              </div>
            </div>
            <ChipGroup
              label={t("lifestyleLabel")}
              options={LIFESTYLE_TAGS.map((l) => ({ value: l, label: tx("lifestyle", l) }))}
              value={draft.lifestyle_tags}
              onChange={(v) => set({ lifestyle_tags: v as string[] })}
              multiple
            />
            <StyleNotesField
              value={draft.style_notes ?? ""}
              onChange={(v) => set({ style_notes: v })}
            />
          </>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <Label htmlFor="home">{t("homeLabel")}</Label>
            <LocationAutocomplete
              id="home"
              placeholder={t("homePlaceholder")}
              value={draft.home_location ?? ""}
              onChange={(text) => set({ home_location: text })}
              onSelect={(r) => set({ home_location: r.label })}
              aria-describedby="home-help"
              aria-invalid={!!error}
            />
            <p id="home-help" className="text-sm text-muted-foreground">
              {t("homeHelp")}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => goTo(Math.max(0, step - 1))}
          disabled={step === 0 || pending}
          className="gap-2"
        >
          <ArrowLeft className="size-4" aria-hidden /> {tc("back")}
        </Button>
        <div className="flex items-center gap-2">
          {current.optional && (
            <Button variant="ghost" onClick={skip} disabled={pending}>
              {tc("skip")}
            </Button>
          )}
          <Button onClick={next} disabled={pending} className="gap-2">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {tc("saving")}
              </>
            ) : step === STEPS.length - 1 ? (
              t("enterWardrobe")
            ) : (
              <>
                {tc("continue")} <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
