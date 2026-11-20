"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { profileSchema, type ProfileInput } from "@/lib/schemas";
import type { Units } from "@/lib/units";
import { useOnboardingStore } from "@/stores/onboarding";
import { saveProfile } from "@/app/onboarding/actions";

const STEPS = [
  { title: "About you", optional: true },
  { title: "Your colouring", optional: true },
  { title: "Your style", optional: false },
  { title: "Home base", optional: false },
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
      setError(result.error.issues[0]?.message ?? "Please complete this step");
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
      setError(result.error.issues[0]?.message ?? "Something is missing");
      return;
    }
    startTransition(async () => {
      const res = await saveProfile(result.data);
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
        Step {step + 1} of {STEPS.length}
        {current.optional && " · optional"}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-4xl outline-none">
        {current.title}
      </h1>
      <Progress
        value={((step + 1) / STEPS.length) * 100}
        className="mt-6 h-1"
        aria-label="Onboarding progress"
      />

      {step < 2 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Every question here is optional. Your answers help the stylist pick colours
          and cuts that flatter you; they are sent to OpenAI only to rank your outfits
          and are never shown to anyone else. Edit them any time in Settings.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {step === 0 && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Measure in</span>
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
                  {u === "metric" ? "cm and kg" : "ft and lb"}
                </button>
              ))}
            </div>
            <BuildFields key={units} draft={draft} set={setPersonal} units={units} />
          </>
        )}

        {step === 1 && <ColoringFields draft={draft} set={setPersonal} />}

        {step === 2 && (
          <>
            <ChipGroup
              label="Styles you love (pick all that apply)"
              options={STYLE_PREFERENCES}
              value={draft.style_preferences}
              onChange={(v) => set({ style_preferences: v as string[] })}
              multiple
            />
            <div>
              <Label id="formality-label" className="text-sm font-medium">
                How dressed-up do you like to be? ({draft.preferred_formality ?? 5}/10)
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
                <span>Relaxed</span>
                <span>Polished</span>
              </div>
            </div>
            <ChipGroup
              label="Your lifestyle (optional)"
              options={LIFESTYLE_TAGS}
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
            <Label htmlFor="home">Where are you based?</Label>
            <LocationAutocomplete
              id="home"
              placeholder="Start typing a city"
              value={draft.home_location ?? ""}
              onChange={(text) => set({ home_location: text })}
              onSelect={(r) => set({ home_location: r.label })}
              aria-describedby="home-help"
              aria-invalid={!!error}
            />
            <p id="home-help" className="text-sm text-muted-foreground">
              Used to check your local weather each morning, and to choose °C or °F.
              You can set a different destination any day.
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
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        <div className="flex items-center gap-2">
          {current.optional && (
            <Button variant="ghost" onClick={skip} disabled={pending}>
              Skip
            </Button>
          )}
          <Button onClick={next} disabled={pending} className="gap-2">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : step === STEPS.length - 1 ? (
              "Enter your wardrobe"
            ) : (
              <>
                Continue <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
