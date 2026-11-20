"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { SeasonPreview } from "@/components/personal/season-preview";
import { deriveColorSeason } from "@/lib/personal/color-season";
import {
  AGE_RANGES,
  BODY_SHAPES,
  EYE_COLORS,
  FIT_LABELS,
  FIT_PREFERENCES,
  GENDERS,
  HAIR_COLORS,
  SKIN_TONE_SWATCH,
  SKIN_TONES,
  SKIN_UNDERTONES,
  STYLE_NOTES_MAX,
  UNDERTONE_HELP,
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from "@/lib/personal/options";
import type { PersonalInput } from "@/lib/schemas";
import type { Units } from "@/lib/units";

export type PersonalDraft = Partial<{ [K in keyof PersonalInput]: PersonalInput[K] | string }>;

const DESELECT_HINT = "Optional. Tap a chosen option again to clear it.";

/** Body measurements in the client's units; stored as cm and kg. */
function Measurements({
  draft,
  set,
  units,
}: {
  draft: PersonalDraft;
  set: (fields: PersonalDraft) => void;
  units: Units;
}) {
  const heightCm = typeof draft.height_cm === "number" ? draft.height_cm : null;
  const weightKg = typeof draft.weight_kg === "number" ? draft.weight_kg : null;
  const ft = heightCm ? cmToFeetInches(heightCm) : null;
  // Imperial height is two fields; keep partial typing local until both make sense.
  const [feet, setFeet] = useState(ft ? String(ft.feet) : "");
  const [inches, setInches] = useState(ft ? String(ft.inches) : "");

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  if (units === "imperial") {
    const updateHeight = (f: string, i: string) => {
      const fv = num(f);
      const iv = num(i) ?? 0;
      set({ height_cm: fv == null ? null : feetInchesToCm(fv, iv) });
    };
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Height (optional)</legend>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="height-ft" className="sr-only">Feet</Label>
              <div className="relative">
                <Input
                  id="height-ft"
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={8}
                  placeholder="5"
                  value={feet}
                  onChange={(e) => {
                    setFeet(e.target.value);
                    updateHeight(e.target.value, inches);
                  }}
                  className="pr-9"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="height-in" className="sr-only">Inches</Label>
              <div className="relative">
                <Input
                  id="height-in"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={11}
                  placeholder="10"
                  value={inches}
                  onChange={(e) => {
                    setInches(e.target.value);
                    updateHeight(feet, e.target.value);
                  }}
                  className="pr-9"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
              </div>
            </div>
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight in lb (optional)</Label>
          <Input
            id="weight"
            type="number"
            inputMode="numeric"
            placeholder="165"
            value={weightKg ? kgToLb(weightKg) : ""}
            onChange={(e) => {
              const v = num(e.target.value);
              set({ weight_kg: v == null ? null : lbToKg(v) });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="height">Height in cm (optional)</Label>
        <Input
          id="height"
          type="number"
          inputMode="numeric"
          placeholder="178"
          value={heightCm ?? ""}
          onChange={(e) => set({ height_cm: num(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weight">Weight in kg (optional)</Label>
        <Input
          id="weight"
          type="number"
          inputMode="numeric"
          placeholder="75"
          value={weightKg ?? ""}
          onChange={(e) => set({ weight_kg: num(e.target.value) })}
        />
      </div>
    </div>
  );
}

/** Gender, age, measurements, body shape and fit. */
export function BuildFields({
  draft,
  set,
  units,
}: {
  draft: PersonalDraft;
  set: (fields: PersonalDraft) => void;
  units: Units;
}) {
  return (
    <div className="space-y-8">
      <ChipGroup
        label="Gender"
        hint={DESELECT_HINT}
        options={[...GENDERS]}
        value={draft.gender as string}
        onChange={(v) => set({ gender: v as string })}
        allowDeselect
      />
      <ChipGroup
        label="Age range"
        options={[...AGE_RANGES]}
        value={draft.age_range as string}
        onChange={(v) => set({ age_range: v as string })}
        allowDeselect
      />
      <Measurements draft={draft} set={set} units={units} />
      <ChipGroup
        label="Body shape"
        hint="Helps the stylist balance proportions. Weight is never sent to the AI."
        options={[...BODY_SHAPES]}
        value={draft.body_shape as string}
        onChange={(v) => set({ body_shape: v as string })}
        allowDeselect
      />
      <ChipGroup
        label="How do you like clothes to fit?"
        options={FIT_PREFERENCES.map((f) => ({ value: f, label: FIT_LABELS[f] }))}
        value={draft.fit_preference as string}
        onChange={(v) => set({ fit_preference: v as string })}
        allowDeselect
      />
    </div>
  );
}

/** Skin, undertone, hair and eyes, with the derived colour season. */
export function ColoringFields({
  draft,
  set,
}: {
  draft: PersonalDraft;
  set: (fields: PersonalDraft) => void;
}) {
  const season = deriveColorSeason({
    skin_tone: draft.skin_tone as string,
    skin_undertone: draft.skin_undertone as string,
    hair_color: draft.hair_color as string,
    eye_color: draft.eye_color as string,
  });
  return (
    <div className="space-y-8">
      <ChipGroup
        label="Skin tone"
        hint={DESELECT_HINT}
        options={[...SKIN_TONES]}
        swatches={SKIN_TONE_SWATCH}
        value={draft.skin_tone as string}
        onChange={(v) => set({ skin_tone: v as string })}
        allowDeselect
      />
      <ChipGroup
        label="Undertone"
        hint={UNDERTONE_HELP}
        options={[...SKIN_UNDERTONES]}
        value={draft.skin_undertone as string}
        onChange={(v) => set({ skin_undertone: v as string })}
        allowDeselect
      />
      <ChipGroup
        label="Hair colour"
        options={[...HAIR_COLORS]}
        value={draft.hair_color as string}
        onChange={(v) => set({ hair_color: v as string })}
        allowDeselect
      />
      <ChipGroup
        label="Eye colour"
        options={[...EYE_COLORS]}
        value={draft.eye_color as string}
        onChange={(v) => set({ eye_color: v as string })}
        allowDeselect
      />
      <div aria-live="polite">
        <SeasonPreview season={season} />
      </div>
    </div>
  );
}

/** Free-text notes for the stylist. */
export function StyleNotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="style-notes">Anything else the stylist should know? (optional)</Label>
      <Textarea
        id="style-notes"
        value={value}
        maxLength={STYLE_NOTES_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. I prefer to cover my arms; no skinny jeans; I run warm."
        aria-describedby="style-notes-count"
      />
      <p id="style-notes-count" className="text-xs text-muted-foreground">
        {value.length}/{STYLE_NOTES_MAX}
      </p>
    </div>
  );
}
