"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import { LanguagePicker } from "@/components/shared/language-picker";
import { PeopleManager, type ManagedPersonView } from "@/components/people/people-manager";
import { FamilyManager } from "@/components/people/family-manager";
import type { FamilyView, InviteForMe } from "@/lib/families/overview";
import { UnitSwitch } from "@/components/shared/unit-switch";
import { useUnits } from "@/components/shared/units-provider";
import { formatTemp } from "@/lib/units";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { useTaxonomy } from "@/i18n/taxonomy";
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
  managedPeople,
  families,
  invites,
  familyChoices,
}: {
  profile: Profile;
  email: string;
  managedPeople: ManagedPersonView[];
  families: FamilyView[];
  invites: InviteForMe[];
  /** Families this Account may add people to. */
  familyChoices: { id: string; name: string }[];
}) {
  const t = useTranslations("settings");
  const tx = useTaxonomy();
  const { units, setUnits, measures, setMeasures } = useUnits();

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
      else toast.success(t("toast.styleSaved"));
    });
  }

  function savePersonal() {
    startPersonal(async () => {
      const res = await updatePersonal(personal);
      if (res?.error) toast.error(res.error);
      else {
        setPersonalDirty(false);
        toast.success(t("toast.personalSaved"), {
          description: t("toast.personalSavedDescription"),
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
      toast.success(t("toast.personalCleared"), {
        action: {
          label: t("toast.undo"),
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
        <p className="text-sm text-muted-foreground">{t("signedInAs")}</p>
        <p className="mt-1 break-all font-medium">{email}</p>
      </section>

      <Section
        id="language-heading"
        title={t("language.title")}
        description={t("language.description")}
      >
        <LanguagePicker id="language" className="w-full sm:w-72" />
      </Section>

      <Section id="style-heading" title={t("style.title")}>
        <ChipGroup
          label={t("style.yourStyles")}
          options={STYLE_PREFERENCES.map((s) => ({ value: s.value, label: tx("style", s.value) }))}
          value={styles}
          onChange={(v) => setStyles(v as string[])}
          multiple
        />

        <div>
          <Label id="formality-label" className="text-sm font-medium">
            {t("style.formality", { value: formality })}
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
            <span>{t("style.relaxed")}</span>
            <span>{t("style.polished")}</span>
          </div>
        </div>

        <ChipGroup
          label={t("style.yourLifestyle")}
          options={LIFESTYLE_TAGS.map((v) => ({ value: v, label: tx("lifestyle", v) }))}
          value={lifestyle}
          onChange={(v) => setLifestyle(v as string[])}
          multiple
        />

        <div className="space-y-2">
          <Label htmlFor="home">{t("style.homeLocation")}</Label>
          <LocationAutocomplete
            id="home"
            placeholder={t("style.homePlaceholder")}
            value={location}
            onChange={setLocation}
            onSelect={(r) => setLocation(r.label)}
          />
        </div>

        <Button onClick={saveStyle} disabled={savingStyle} className="gap-2">
          {savingStyle && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("style.save")}
        </Button>
      </Section>

      <Separator />

      <Section
        id="personal-heading"
        title={t("personal.title")}
        description={t("personal.description")}
      >
        <BuildFields
          key={`${measures.weight}-${measures.height}-${resetKey}`}
          draft={personal}
          set={patchPersonal}
          measures={measures}
        />
        <ColoringFields draft={personal} set={patchPersonal} />
        <StyleNotesField
          value={(personal.style_notes as string) ?? ""}
          onChange={(v) => patchPersonal({ style_notes: v })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={savePersonal} disabled={savingPersonal || !personalDirty} className="gap-2">
            {savingPersonal && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("personal.save")}
          </Button>
          <Button variant="ghost" onClick={forgetPersonal} disabled={savingPersonal} className="text-muted-foreground">
            {t("personal.clearAll")}
          </Button>
          {personalDirty && (
            <span className="text-sm text-muted-foreground" role="status">
              {t("personal.unsaved")}
            </span>
          )}
        </div>
      </Section>

      <Separator />

      <div id="people" className="scroll-mt-16">
        <Section
          id="people-heading"
          title={t("people.title")}
          description={t("people.description")}
        >
          <PeopleManager people={managedPeople} units={measures.height} familyChoices={familyChoices} />
        </Section>
      </div>

      <Separator />

      <div id="family" className="scroll-mt-16">
        <Section
          id="family-heading"
          title={t("family.title")}
          description={t("family.description")}
        >
          <FamilyManager families={families} invites={invites} />
        </Section>
      </div>

      <Separator />

      <Section id="units-heading" title={t("units.title")} description={t("units.description")}>
        <div className="space-y-3">
          <span id="units-label" className="text-sm font-medium">
            {t("units.temperature")}
          </span>
          <UnitSwitch value={units} onChange={setUnits} aria-labelledby="units-label" />
          <p className="text-sm text-muted-foreground">
            {t("units.temperatureExample", { example: formatTemp(21, units) })}
          </p>
        </div>
        <ChipGroup
          label={t("units.weight")}
          options={[
            { value: "kg", label: t("units.kilograms") },
            { value: "lb", label: t("units.pounds") },
          ]}
          value={measures.weight}
          onChange={(v) => setMeasures({ weight: v as "kg" | "lb" })}
        />
        <ChipGroup
          label={t("units.height")}
          options={[
            { value: "cm", label: t("units.centimetres") },
            { value: "ftin", label: t("units.feetInches") },
          ]}
          value={measures.height}
          onChange={(v) => setMeasures({ height: v as "cm" | "ftin" })}
        />
      </Section>

      <Separator />

      <SignOutButton />
    </div>
  );
}
