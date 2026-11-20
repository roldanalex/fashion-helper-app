"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { useTranslations } from "next-intl";
import { useValidationMessage } from "@/i18n/validation";
import { useTaxonomy } from "@/i18n/taxonomy";
import {
  CATEGORIES,
  MATERIALS,
  PATTERNS,
  SEASONS,
  SUBCATEGORIES,
  detailFieldsFor,
  type AccessoryAttributeKey,
} from "@/lib/constants";
import { EMPTY_ATTRIBUTES, itemTagsSchema } from "@/lib/schemas";
import { archiveItem, confirmItemTags, unarchiveItem } from "@/app/(app)/wardrobe/actions";
import type { ClothingItem } from "@/types/database";
import type { Category } from "@/lib/constants";

export function TagEditor({ item }: { item: ClothingItem }) {
  const t = useTranslations("wardrobe.tags");
  const vmsg = useValidationMessage();
  const tx = useTaxonomy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [reanalyzing, setReanalyzing] = useState(false);

  const [tags, setTags] = useState({
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? "",
    color_name: item.color_name ?? "",
    color_hex: item.color_hex ?? "#888888",
    pattern: item.pattern ?? "solid",
    material: item.material ?? "cotton",
    season: item.season ?? [],
    formality_level: item.formality_level ?? 5,
    old_money_score: item.old_money_score ?? 5,
    attributes: {
      ...EMPTY_ATTRIBUTES,
      ...(item.attributes ?? {}),
    } as Record<AccessoryAttributeKey, string | null>,
  });

  function set<K extends keyof typeof tags>(key: K, value: (typeof tags)[K]) {
    setTags((t) => ({ ...t, [key]: value }));
  }

  function setAttribute(key: AccessoryAttributeKey, value: string | null) {
    setTags((t) => ({ ...t, attributes: { ...t.attributes, [key]: value } }));
  }

  // Extra chip rows for watches and accessories with type-specific details.
  const detailFields = detailFieldsFor(tags.category, tags.subcategory);

  function save() {
    // Details only make sense for the current type; clear stale ones.
    const allowed = new Set(detailFields.map((f) => f.key));
    const attributes: Record<AccessoryAttributeKey, string | null> = {
      ...EMPTY_ATTRIBUTES,
    };
    for (const key of allowed) attributes[key] = tags.attributes[key] ?? null;
    const parsed = itemTagsSchema.safeParse({ ...tags, attributes });
    if (!parsed.success) {
      toast.error(vmsg(parsed.error.issues[0]?.message, t("checkTags")));
      return;
    }
    startTransition(async () => {
      const res = await confirmItemTags(item.id, item.person_id, parsed.data);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("saved"));
      // Fire-and-forget: the combination engine works in the background.
      fetch("/api/combinations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, personId: item.person_id }),
      })
        .catch(() => {})
        .finally(() => queryClient.invalidateQueries({ queryKey: ["combination-status"] }));
      // Show the "building outfits" banner straight away.
      queryClient.invalidateQueries({ queryKey: ["combination-status"] });
      router.push("/wardrobe");
      router.refresh();
    });
  }

  async function reanalyze() {
    setReanalyzing(true);
    try {
      const res = await fetch("/api/items/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, personId: item.person_id }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("reanalyzed"));
      router.refresh();
    } catch {
      toast.error(t("reanalyzeFailed"));
    } finally {
      setReanalyzing(false);
    }
  }

  function archive() {
    startTransition(async () => {
      const res = await archiveItem(item.id, item.person_id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("archived", { name: tags.name }), {
        description: t("archivedDescription"),
        action: {
          label: t("undo"),
          onClick: async () => {
            const undo = await unarchiveItem(item.id, item.person_id);
            if (undo?.error) toast.error(undo.error);
            else toast.success(t("restored", { name: tags.name }));
            router.refresh();
          },
        },
      });
      router.push("/wardrobe");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            value={tags.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">{t("color")}</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              value={tags.color_name}
              onChange={(e) => set("color_name", e.target.value)}
              placeholder={t("colorPlaceholder")}
            />
            <input
              type="color"
              aria-label={t("colorSwatch")}
              className="h-9 w-12 shrink-0 cursor-pointer pointer-coarse:h-11 pointer-coarse:w-14 rounded-md border bg-transparent"
              value={tags.color_hex}
              onChange={(e) => set("color_hex", e.target.value)}
            />
          </div>
        </div>
      </div>

      <ChipGroup
        label={t("category")}
        options={CATEGORIES.map((o) => ({ value: o, label: tx("category", o) }))}
        value={tags.category}
        onChange={(v) => {
          set("category", v as Category);
          set("subcategory", "");
        }}
      />

      <ChipGroup
        label={tags.category === "watch" ? t("watchStyle") : t("type")}
        options={(SUBCATEGORIES[tags.category as Category] ?? []).map((o) => ({
          value: o,
          label: tx("subcategory", o),
        }))}
        value={tags.subcategory}
        onChange={(v) => set("subcategory", v as string)}
      />

      {detailFields.map((field) => (
        <ChipGroup
          key={field.key}
          label={tx("detailLabel", field.label)}
          options={field.options.map((o) => ({
            value: o,
            label: tx("attribute", o),
          }))}
          value={tags.attributes[field.key] ?? undefined}
          onChange={(v) =>
            setAttribute(
              field.key,
              tags.attributes[field.key] === v ? null : (v as string),
            )
          }
        />
      ))}

      <ChipGroup
        label={t("material")}
        options={MATERIALS.map((o) => ({ value: o, label: tx("material", o) }))}
        value={tags.material}
        onChange={(v) => set("material", v as string)}
      />

      <ChipGroup
        label={t("pattern")}
        options={PATTERNS.map((o) => ({ value: o, label: tx("pattern", o) }))}
        value={tags.pattern}
        onChange={(v) => set("pattern", v as string)}
      />

      <ChipGroup
        label={t("seasons")}
        options={SEASONS.map((o) => ({ value: o, label: tx("season", o) }))}
        value={tags.season}
        onChange={(v) => set("season", v as string[])}
        multiple
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <Label id="formality-label" className="text-sm font-medium">
            {t("formality", { value: tags.formality_level })}
          </Label>
          <Slider
            className="mt-3"
            min={1}
            max={10}
            step={1}
            value={[tags.formality_level]}
            onValueChange={([v]) => set("formality_level", v)}
            aria-labelledby="formality-label"
          />
        </div>
        <div>
          <Label id="old-money-label" className="text-sm font-medium">
            {t("oldMoney", { value: tags.old_money_score })}
          </Label>
          <Slider
            className="mt-3"
            min={1}
            max={10}
            step={1}
            value={[tags.old_money_score]}
            onValueChange={([v]) => set("old_money_score", v)}
            aria-labelledby="old-money-label"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button onClick={save} disabled={pending || reanalyzing} className="gap-2">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          {item.ai_status === "confirmed" ? t("saveChanges") : t("confirm")}
        </Button>
        <Button
          variant="outline"
          onClick={reanalyze}
          disabled={pending || reanalyzing}
          className="gap-2"
        >
          {reanalyzing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {t("reanalyze")}
        </Button>
        <Button
          variant="ghost"
          onClick={archive}
          disabled={pending || reanalyzing}
          className="gap-2 text-muted-foreground"
        >
          <Archive className="size-4" aria-hidden /> {t("archive")}
        </Button>
      </div>
    </div>
  );
}
