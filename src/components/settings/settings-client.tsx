"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ChipGroup } from "@/components/onboarding/chip-group";
import {
  BuildFields,
  ColoringFields,
  StyleNotesField,
  type PersonalDraft,
} from "@/components/personal/personal-fields";
import { LocationAutocomplete } from "@/components/today/location-autocomplete";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { UnitSwitch } from "@/components/shared/unit-switch";
import { useUnits } from "@/components/shared/units-provider";
import { formatTemp } from "@/lib/units";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { clearPersonal, updatePersonal, updateSettings } from "@/app/(app)/settings/actions";
import type { Profile } from "@/types/database";

const LIFESTYLE_TAGS = ["office", "remote work", "parent", "travel often", "gym", "social events"];

function personalFrom(profile: Profile): PersonalDraft {
  return {
    gender: profile.gender,
    age_range: profile.age_range,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    body_shape: profile.body_shape,
    skin_tone: profile.skin_tone,
    skin_undertone: profile.skin_undertone,
    hair_color: profile.hair_color,
    eye_color: profile.eye_color,
    fit_preference: profile.fit_preference ?? null,
    style_notes: profile.style_notes ?? "",
  };
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-6">
      <div>
        <h2 id={id} className="text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingsClient({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const { units, setUnits } = useUnits();

  // Style and home
  const [savingStyle, startStyle] = useTransition();
  const [styles, setStyles] = useState<string[]>(profile.style_preferences);
  const [formality, setFormality] = useState(profile.preferred_formality ?? 5);
  const [lifestyle, setLifestyle] = useState<string[]>(profile.lifestyle_tags ?? []);
  const [location, setLocation] = useState(profile.home_location ?? "");

  // Build and colouring
  const [savingPersonal, startPersonal] = useTransition();
  const [personal, setPersonal] = useState<PersonalDraft>(() => personalFrom(profile));
  const [personalDirty, setPersonalDirty] = useState(false);
  // Remounts the measurement inputs after a clear or undo (imperial keeps local text).
  const [resetKey, setResetKey] = useState(0);
  const patchPersonal = (fields: PersonalDraft) => {
    setPersonal((p) => ({ ...p, ...fields }));
    setPersonalDirty(true);
  };

  function saveStyle() {
    startStyle(async () => {
      const res = await updateSettings({
        style_preferences: styles,
        preferred_formality: formality,
        lifestyle_tags: lifestyle,
        home_location: location,
      });
      if (res?.error) toast.error(res.error);
      else toast.success("Style and home saved");
    });
  }

  function savePersonal() {
    startPersonal(async () => {
      const res = await updatePersonal(personal);
      if (res?.error) toast.error(res.error);
      else {
        setPersonalDirty(false);
        toast.success("Build and colouring saved", {
          description: "Today's picks and the stylist use them from your next request.",
        });
      }
    });
  }

  function forgetPersonal() {
    const previous = personal;
    startPersonal(async () => {
      const res = await clearPersonal();
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setPersonal({
        ...Object.fromEntries(Object.keys(previous).map((k) => [k, null])),
        style_notes: "",
      });
      setPersonalDirty(false);
      setResetKey((k) => k + 1);
      toast.success("Build and colouring cleared", {
        action: {
          label: "Undo",
          onClick: () =>
            startPersonal(async () => {
              const undo = await updatePersonal(previous);
              if (undo?.error) toast.error(undo.error);
              else {
                setPersonal(previous);
                setResetKey((k) => k + 1);
              }
            }),
        },
      });
    });
  }

  return (
    <div className="max-w-xl space-y-12">
      <section className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-1 break-all font-medium">{email}</p>
      </section>

      <Section id="style-heading" title="Style and home">
        <ChipGroup
          label="Your styles"
          options={STYLE_PREFERENCES}
          value={styles}
          onChange={(v) => setStyles(v as string[])}
          multiple
        />

        <div>
          <Label id="formality-label" className="text-sm font-medium">
            Preferred formality ({formality}/10)
          </Label>
          <Slider
            className="mt-3"
            min={1}
            max={10}
            step={1}
            value={[formality]}
            onValueChange={([v]) => setFormality(v)}
            aria-labelledby="formality-label"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground" aria-hidden>
            <span>Relaxed</span>
            <span>Polished</span>
          </div>
        </div>

        <ChipGroup
          label="Your lifestyle"
          options={LIFESTYLE_TAGS}
          value={lifestyle}
          onChange={(v) => setLifestyle(v as string[])}
          multiple
        />

        <div className="space-y-2">
          <Label htmlFor="home">Home location</Label>
          <LocationAutocomplete
            id="home"
            placeholder="Start typing a city"
            value={location}
            onChange={setLocation}
            onSelect={(r) => setLocation(r.label)}
          />
        </div>

        <Button onClick={saveStyle} disabled={savingStyle} className="gap-2">
          {savingStyle && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save style and home
        </Button>
      </Section>

      <Separator />

      <Section
        id="personal-heading"
        title="Your build and colouring"
        description="Optional. The stylist uses these to favour colours that flatter you near the face and cuts that suit your build, on Today, in the Stylist chat and in Shop. They are sent to OpenAI only to rank your outfits, weight is never sent, and nothing here is shown to anyone else."
      >
        <BuildFields
          key={`${units}-${resetKey}`}
          draft={personal}
          set={patchPersonal}
          units={units}
        />
        <ColoringFields draft={personal} set={patchPersonal} />
        <StyleNotesField
          value={(personal.style_notes as string) ?? ""}
          onChange={(v) => patchPersonal({ style_notes: v })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={savePersonal} disabled={savingPersonal || !personalDirty} className="gap-2">
            {savingPersonal && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save build and colouring
          </Button>
          <Button variant="ghost" onClick={forgetPersonal} disabled={savingPersonal} className="text-muted-foreground">
            Clear all
          </Button>
          {personalDirty && (
            <span className="text-sm text-muted-foreground" role="status">
              Unsaved changes
            </span>
          )}
        </div>
      </Section>

      <Separator />

      <Section id="units-heading" title="Temperature">
        <div className="space-y-3">
          <span id="units-label" className="sr-only">
            Temperature unit
          </span>
          <UnitSwitch value={units} onChange={setUnits} aria-labelledby="units-label" />
          <p className="text-sm text-muted-foreground">
            Weather on Today and in trip plans reads as {formatTemp(21, units)}, and height and
            weight above use {units === "imperial" ? "feet and pounds" : "centimetres and kilograms"}.
            Saves as soon as you pick.
          </p>
        </div>
      </Section>

      <Separator />

      <SignOutButton />
    </div>
  );
}
