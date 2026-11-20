"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";
import { Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { ColoringFields, StyleNotesField, type PersonalDraft } from "@/components/personal/personal-fields";
import { PersonInitial } from "@/components/people/person-switcher";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { AGE_BANDS } from "@/lib/people/schema";
import {
  BODY_SHAPES,
  FIT_PREFERENCES,
  GENDERS,
  cmToFeetInches,
  feetInchesToCm,
} from "@/lib/personal/options";
import { addPerson, deletePerson, updatePerson } from "@/app/(app)/people/actions";
import type { AgeBand, Person } from "@/types/database";
import type { HeightUnit } from "@/lib/units";

export interface ManagedPersonView {
  person: Person;
  pieceCount: number;
}

interface FormState {
  display_name: string;
  age_band: AgeBand;
  guardian: boolean;
  style_preferences: string[];
  preferred_formality: number;
  personal: PersonalDraft;
}

function emptyForm(): FormState {
  return {
    display_name: "",
    age_band: "child",
    guardian: false,
    style_preferences: [],
    preferred_formality: 4,
    personal: {},
  };
}

function formFrom(p: Person): FormState {
  return {
    display_name: p.display_name,
    age_band: p.age_band,
    guardian: !!p.guardian_attested_at,
    style_preferences: p.style_preferences,
    preferred_formality: p.preferred_formality ?? 5,
    personal: {
      gender: p.gender,
      skin_tone: p.skin_tone,
      skin_undertone: p.skin_undertone,
      hair_color: p.hair_color,
      eye_color: p.eye_color,
      height_cm: p.height_cm,
      body_shape: p.body_shape,
      fit_preference: p.fit_preference,
      style_notes: p.style_notes ?? "",
    },
  };
}

/** Height in the Account's height unit; stored in cm. Feet and inches keep partial typing locally. */
function HeightInput({
  units,
  value,
  onChange,
}: {
  units: HeightUnit;
  value: number | null;
  onChange: (cm: number | null) => void;
}) {
  const t = useTranslations("people.form");
  const initial = value ? cmToFeetInches(value) : null;
  const [feet, setFeet] = useState(initial ? String(initial.feet) : "");
  const [inches, setInches] = useState(initial ? String(initial.inches) : "");

  if (units === "cm") {
    return (
      <div className="space-y-2">
        <Label htmlFor="person-height">{t("heightCm")}</Label>
        <Input
          id="person-height"
          type="number"
          inputMode="numeric"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
    );
  }

  const update = (f: string, i: string) =>
    onChange(f.trim() ? feetInchesToCm(Number(f), Number(i || 0)) : null);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("height")}</legend>
      <div className="flex gap-2">
        <Input
          aria-label={t("feet")}
          type="number"
          inputMode="numeric"
          placeholder="5 ft"
          value={feet}
          onChange={(e) => {
            setFeet(e.target.value);
            update(e.target.value, inches);
          }}
        />
        <Input
          aria-label={t("inches")}
          type="number"
          inputMode="numeric"
          placeholder="10 in"
          value={inches}
          onChange={(e) => {
            setInches(e.target.value);
            update(feet, e.target.value);
          }}
        />
      </div>
    </fieldset>
  );
}

function PersonForm({
  form,
  setForm,
  units,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  units: HeightUnit;
}) {
  const t = useTranslations("people.form");
  const tx = useTaxonomy();
  const minor = form.age_band !== "adult";
  const patch = (fields: Partial<FormState>) => setForm({ ...form, ...fields });
  const patchPersonal = (fields: PersonalDraft) => patch({ personal: { ...form.personal, ...fields } });
  const heightCm = typeof form.personal.height_cm === "number" ? form.personal.height_cm : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="person-name">{t("name")}</Label>
        <Input
          id="person-name"
          value={form.display_name}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => patch({ display_name: e.target.value })}
          aria-describedby="person-name-help"
        />
        <p id="person-name-help" className="text-xs text-muted-foreground">
          {t("nameHelp")}
        </p>
      </div>

      <ChipGroup
        label={t("age")}
        options={AGE_BANDS.map((b) => ({ value: b, label: tx("ageBand", b) }))}
        value={form.age_band}
        onChange={(v) => patch({ age_band: v as AgeBand })}
      />

      {minor && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="guardian"
              checked={form.guardian}
              onCheckedChange={(v) => patch({ guardian: v === true })}
              className="mt-0.5"
            />
            <Label htmlFor="guardian" className="text-sm leading-relaxed font-normal">
              {t("guardian")}
            </Label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("childPrivacy")}
          </p>
        </div>
      )}

      <ChipGroup
        label={t("styles")}
        options={STYLE_PREFERENCES.map((s) => ({ value: s.value, label: tx("style", s.value) }))}
        value={form.style_preferences}
        onChange={(v) => patch({ style_preferences: v as string[] })}
        multiple
      />

      <div>
        <Label id="person-formality-label" className="text-sm font-medium">
          {t("formality", { value: form.preferred_formality })}
        </Label>
        <Slider
          className="mt-4"
          min={1}
          max={10}
          step={1}
          value={[form.preferred_formality]}
          onValueChange={([v]) => patch({ preferred_formality: v })}
          aria-labelledby="person-formality-label"
        />
      </div>

      {!minor && (
        <>
          <ChipGroup
            label={t("gender")}
            options={GENDERS.map((g) => ({ value: g, label: tx("gender", g) }))}
            value={form.personal.gender as string}
            onChange={(v) => patchPersonal({ gender: v as string })}
            allowDeselect
          />
          <HeightInput
            units={units}
            value={heightCm}
            onChange={(cm) => patchPersonal({ height_cm: cm })}
          />
          <ChipGroup
            label={t("bodyShape")}
            options={BODY_SHAPES.map((b) => ({ value: b, label: tx("bodyShape", b) }))}
            value={form.personal.body_shape as string}
            onChange={(v) => patchPersonal({ body_shape: v as string })}
            allowDeselect
          />
        </>
      )}

      <ChipGroup
        label={t("fit")}
        options={FIT_PREFERENCES.map((f) => ({ value: f, label: tx("fit", f) }))}
        value={form.personal.fit_preference as string}
        onChange={(v) => patchPersonal({ fit_preference: v as string })}
        allowDeselect
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("colouring")}</p>
        <p className="text-sm text-muted-foreground">
          {minor
            ? t("colouringMinor")
            : t("colouringAdult")}
        </p>
      </div>
      <ColoringFields draft={form.personal} set={patchPersonal} />

      {!minor && (
        <StyleNotesField
          value={(form.personal.style_notes as string) ?? ""}
          onChange={(v) => patchPersonal({ style_notes: v })}
        />
      )}
    </div>
  );
}

export function PeopleManager({
  people,
  units,
  familyChoices = [],
}: {
  people: ManagedPersonView[];
  units: HeightUnit;
  /** Families this Account may add people to; a choice appears when there are several. */
  familyChoices?: { id: string; name: string }[];
}) {
  const t = useTranslations("people.manager");
  const tx = useTaxonomy();
  const [familyId, setFamilyId] = useState<string | undefined>(familyChoices[0]?.id);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [deleting, setDeleting] = useState<ManagedPersonView | null>(null);

  function payload(form: FormState) {
    const minor = form.age_band !== "adult";
    const p = form.personal;
    return {
      display_name: form.display_name,
      age_band: form.age_band,
      guardian: form.guardian,
      style_preferences: form.style_preferences,
      preferred_formality: form.preferred_formality,
      personal: {
        gender: minor ? null : p.gender,
        skin_tone: p.skin_tone,
        skin_undertone: p.skin_undertone,
        hair_color: p.hair_color,
        eye_color: p.eye_color,
        fit_preference: p.fit_preference,
        height_cm: minor ? null : p.height_cm,
        body_shape: minor ? null : p.body_shape,
        style_notes: minor ? null : p.style_notes || null,
      },
    };
  }

  function save() {
    if (!editing) return;
    const { id, form } = editing;
    start(async () => {
      const res = id ? await updatePerson(id, payload(form)) : await addPerson(payload(form), familyId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(id ? t("saved", { name: form.display_name }) : t("added", { name: form.display_name }), {
        description: id
          ? undefined
          : t("addedDescription"),
      });
      setEditing(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const { person } = deleting;
    start(async () => {
      const res = await deletePerson(person.id);
      if (res?.error) toast.error(res.error);
      else toast.success(t("deleted", { name: person.display_name }));
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {people.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card">
          {people.map(({ person, pieceCount }) => (
            <li key={person.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <PersonInitial name={person.display_name} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{person.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {tx("ageBand", person.age_band)} · {t("pieces", { count: pieceCount })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing({ id: person.id, form: formFrom(person) })}
              >
                <Pencil aria-hidden /> {t("edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setDeleting({ person, pieceCount })}
              >
                <Trash2 aria-hidden /> {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" className="gap-2" onClick={() => setEditing({ id: null, form: emptyForm() })}>
        <UserPlus aria-hidden /> {t("addPerson")}
      </Button>

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">
              {editing?.id
                ? editing.form.display_name
                  ? t("editTitle", { name: editing.form.display_name })
                  : t("editTitleFallback")
                : t("addPerson")}
            </SheetTitle>
            <SheetDescription>
              {t("sheetDescription")}
            </SheetDescription>
          </SheetHeader>
          {editing && !editing.id && familyChoices.length > 1 && (
            <div className="px-4">
              <ChipGroup
                label={t("addThemTo")}
                options={familyChoices.map((f) => ({ value: f.id, label: f.name }))}
                value={familyId}
                onChange={(v) => setFamilyId(v as string)}
              />
            </div>
          )}
          {editing && (
            <div className="px-4">
              <PersonForm
                form={editing.form}
                setForm={(form) => setEditing({ ...editing, form })}
                units={units}
              />
            </div>
          )}
          <div className="sticky bottom-0 mt-6 flex gap-2 border-t bg-popover p-4">
            <Button variant="ghost" className="flex-1" onClick={() => setEditing(null)}>
              {t("cancel")}
            </Button>
            <Button className="flex-1 gap-2" onClick={save} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {editing?.id ? t("save") : t("addPersonShort")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle", { name: deleting?.person.display_name ?? "" })}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription", {
                name: deleting?.person.display_name ?? "",
                count: deleting?.pieceCount ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("keepThem")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
