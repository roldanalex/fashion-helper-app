"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";
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
  FIT_PREFERENCES,
  GENDERS,
  HAIR_COLORS,
  SKIN_TONE_SWATCH,
  SKIN_TONES,
  SKIN_UNDERTONES,
  STYLE_NOTES_MAX,
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from "@/lib/personal/options";
import type { PersonalInput } from "@/lib/schemas";
import type { MeasureUnits } from "@/lib/units";

export type PersonalDraft = Partial<{ [K in keyof PersonalInput]: PersonalInput[K] | string }>;

/** Body measurements, each in its own unit; stored as cm and kg. */
function Measurements({
  draft,
  set,
  measures,
}: {
  draft: PersonalDraft;
  set: (fields: PersonalDraft) => void;
  measures: MeasureUnits;
}) {
  const t = useTranslations("personal");
  const heightCm = typeof draft.height_cm === "number" ? draft.height_cm : null;
  const weightKg = typeof draft.weight_kg === "number" ? draft.weight_kg : null;
  const ft = heightCm ? cmToFeetInches(heightCm) : null;
  // Feet and inches are two fields; keep partial typing local until both make sense.
  const [feet, setFeet] = useState(ft ? String(ft.feet) : "");
  const [inches, setInches] = useState(ft ? String(ft.inches) : "");
  // Show exactly what was typed; pounds are stored as whole kilograms, so
  // re-deriving the box from the stored value would rewrite each keystroke.
  const [pounds, setPounds] = useState(weightKg ? String(kgToLb(weightKg)) : "");

  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const updateHeight = (f: string, i: string) => {
    const fv = num(f);
    set({ height_cm: fv == null ? null : feetInchesToCm(fv, num(i) ?? 0) });
  };

  const height =
    measures.height === "ftin" ? (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("heightOptional")}</legend>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="height-ft" className="sr-only">{t("feet")}</Label>
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
            <Label htmlFor="height-in" className="sr-only">{t("inches")}</Label>
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
    ) : (
      <div className="space-y-2">
        <Label htmlFor="height">{t("heightCm")}</Label>
        <Input
          id="height"
          type="number"
          inputMode="numeric"
          placeholder="178"
          value={heightCm ?? ""}
          onChange={(e) => set({ height_cm: num(e.target.value) })}
        />
      </div>
    );

  const weight =
    measures.weight === "lb" ? (
      <div className="space-y-2">
        <Label htmlFor="weight">{t("weightLb")}</Label>
        <Input
          id="weight"
          type="number"
          inputMode="numeric"
          placeholder="165"
          min={66}
          max={551}
          value={pounds}
          onChange={(e) => {
            setPounds(e.target.value);
            const v = num(e.target.value);
            set({ weight_kg: v == null ? null : lbToKg(v) });
          }}
        />
      </div>
    ) : (
      <div className="space-y-2">
        <Label htmlFor="weight">{t("weightKg")}</Label>
        <Input
          id="weight"
          type="number"
          inputMode="numeric"
          placeholder="75"
          value={weightKg ?? ""}
          onChange={(e) => set({ weight_kg: num(e.target.value) })}
        />
      </div>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {height}
      {weight}
    </div>
  );
}

/** Gender, age, measurements, body shape and fit. */
export function BuildFields({
  draft,
  set,
  measures,
}: {
  draft: PersonalDraft;
  set: (fields: PersonalDraft) => void;
  measures: MeasureUnits;
}) {
  const t = useTranslations("personal");
  const tx = useTaxonomy();
  return (
    <div className="space-y-8">
      <ChipGroup
        label={t("gender")}
        hint={t("deselectHint")}
        options={GENDERS.map((v) => ({ value: v, label: tx("gender", v) }))}
        value={draft.gender as string}
        onChange={(v) => set({ gender: v as string })}
        allowDeselect
      />
      <ChipGroup
        label={t("ageRange")}
        options={AGE_RANGES.map((v) => ({ value: v, label: tx("ageRange", v) }))}
        value={draft.age_range as string}
        onChange={(v) => set({ age_range: v as string })}
        allowDeselect
      />
      <Measurements draft={draft} set={set} measures={measures} />
      <ChipGroup
        label={t("bodyShape")}
        hint={t("bodyShapeHint")}
        options={BODY_SHAPES.map((v) => ({ value: v, label: tx("bodyShape", v) }))}
        value={draft.body_shape as string}
        onChange={(v) => set({ body_shape: v as string })}
        allowDeselect
      />
      <ChipGroup
        label={t("fit")}
        options={FIT_PREFERENCES.map((f) => ({ value: f, label: tx("fit", f) }))}
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
  const t = useTranslations("personal");
  const tx = useTaxonomy();
  const season = deriveColorSeason({
    skin_tone: draft.skin_tone as string,
    skin_undertone: draft.skin_undertone as string,
    hair_color: draft.hair_color as string,
    eye_color: draft.eye_color as string,
  });
  return (
    <div className="space-y-8">
      <ChipGroup
        label={t("skinTone")}
        hint={t("deselectHint")}
        options={SKIN_TONES.map((v) => ({ value: v, label: tx("skinTone", v) }))}
        swatches={SKIN_TONE_SWATCH}
        value={draft.skin_tone as string}
        onChange={(v) => set({ skin_tone: v as string })}
        allowDeselect
      />
      <ChipGroup
        label={t("undertone")}
        hint={t("undertoneHelp")}
        options={SKIN_UNDERTONES.map((v) => ({ value: v, label: tx("undertone", v) }))}
        value={draft.skin_undertone as string}
        onChange={(v) => set({ skin_undertone: v as string })}
        allowDeselect
      />
      <ChipGroup
        label={t("hairColor")}
        options={HAIR_COLORS.map((v) => ({ value: v, label: tx("hairColor", v) }))}
        value={draft.hair_color as string}
        onChange={(v) => set({ hair_color: v as string })}
        allowDeselect
      />
      <ChipGroup
        label={t("eyeColor")}
        options={EYE_COLORS.map((v) => ({ value: v, label: tx("eyeColor", v) }))}
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
  const t = useTranslations("personal");
  return (
    <div className="space-y-2">
      <Label htmlFor="style-notes">{t("styleNotes")}</Label>
      <Textarea
        id="style-notes"
        value={value}
        maxLength={STYLE_NOTES_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("styleNotesPlaceholder")}
        aria-describedby="style-notes-count"
      />
      <p id="style-notes-count" className="text-xs text-muted-foreground">
        {value.length}/{STYLE_NOTES_MAX}
      </p>
    </div>
  );
}
