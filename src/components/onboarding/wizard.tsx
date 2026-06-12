"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { profileSchema, type ProfileInput } from "@/lib/schemas";
import { useOnboardingStore } from "@/stores/onboarding";
import { saveProfile } from "@/app/onboarding/actions";

const STEPS = ["About you", "Your coloring", "Your style", "Home base"] as const;

const stepFields: (keyof ProfileInput)[][] = [
  ["gender", "age_range", "height_cm", "weight_kg", "body_shape"],
  ["skin_tone", "skin_undertone", "hair_color", "eye_color"],
  ["preferred_formality", "style_preferences", "lifestyle_tags"],
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

export function OnboardingWizard() {
  const { draft, step, set, setStep } = useOnboardingStore();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  function next() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
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
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <p className="text-sm uppercase tracking-[0.25em] text-primary">
        Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-2 text-4xl">{STEPS[step]}</h1>
      <Progress
        value={((step + 1) / STEPS.length) * 100}
        className="mt-6 h-1"
        aria-label="Onboarding progress"
      />

      <div className="mt-10 space-y-8">
        {step === 0 && (
          <>
            <ChipGroup
              label="Gender"
              options={["male", "female", "other"]}
              value={draft.gender}
              onChange={(v) => set({ gender: v as ProfileInput["gender"] })}
            />
            <ChipGroup
              label="Age range"
              options={["18-24", "25-34", "35-44", "45-54", "55+"]}
              value={draft.age_range}
              onChange={(v) => set({ age_range: v as ProfileInput["age_range"] })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  inputMode="numeric"
                  placeholder="178"
                  value={draft.height_cm ?? ""}
                  onChange={(e) =>
                    set({ height_cm: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  inputMode="numeric"
                  placeholder="75"
                  value={draft.weight_kg ?? ""}
                  onChange={(e) =>
                    set({ weight_kg: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>
            <ChipGroup
              label="Body shape"
              options={["slim", "average", "athletic", "broad", "full"]}
              value={draft.body_shape}
              onChange={(v) => set({ body_shape: v as ProfileInput["body_shape"] })}
            />
          </>
        )}

        {step === 1 && (
          <>
            <ChipGroup
              label="Skin tone"
              options={["fair", "light", "medium", "olive", "tan", "deep"]}
              value={draft.skin_tone}
              onChange={(v) => set({ skin_tone: v as ProfileInput["skin_tone"] })}
            />
            <ChipGroup
              label="Undertone"
              options={["warm", "cool", "neutral"]}
              value={draft.skin_undertone}
              onChange={(v) =>
                set({ skin_undertone: v as ProfileInput["skin_undertone"] })
              }
            />
            <ChipGroup
              label="Hair color"
              options={[
                "black",
                "dark brown",
                "brown",
                "light brown",
                "blonde",
                "red",
                "gray",
                "white",
              ]}
              value={draft.hair_color}
              onChange={(v) => set({ hair_color: v as ProfileInput["hair_color"] })}
            />
            <ChipGroup
              label="Eye color"
              options={["brown", "hazel", "green", "blue", "gray"]}
              value={draft.eye_color}
              onChange={(v) => set({ eye_color: v as ProfileInput["eye_color"] })}
            />
          </>
        )}

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
              <Label className="text-sm font-medium">
                How dressed-up do you like to be? ({draft.preferred_formality ?? 5}/10)
              </Label>
              <Slider
                className="mt-4"
                min={1}
                max={10}
                step={1}
                value={[draft.preferred_formality ?? 5]}
                onValueChange={([v]) => set({ preferred_formality: v })}
                aria-label="Preferred formality"
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
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
          </>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <Label htmlFor="home">Where are you based?</Label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="home"
                className="pl-9"
                placeholder="e.g. San Juan, Puerto Rico"
                value={draft.home_location ?? ""}
                onChange={(e) => set({ home_location: e.target.value })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Used to check your local weather each morning. You can set a
              different destination any day.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0 || pending}
          className="gap-2"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        <Button onClick={next} disabled={pending} className="gap-2">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
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
  );
}
