"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ChipGroup } from "@/components/onboarding/chip-group";
import {
  CATEGORIES,
  MATERIALS,
  PATTERNS,
  SEASONS,
  SUBCATEGORIES,
} from "@/lib/constants";
import { itemTagsSchema } from "@/lib/schemas";
import { archiveItem, confirmItemTags } from "@/app/(app)/wardrobe/actions";
import type { ClothingItem } from "@/types/database";
import type { Category } from "@/lib/constants";

export function TagEditor({ item }: { item: ClothingItem }) {
  const router = useRouter();
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
  });

  function set<K extends keyof typeof tags>(key: K, value: (typeof tags)[K]) {
    setTags((t) => ({ ...t, [key]: value }));
  }

  function save() {
    const parsed = itemTagsSchema.safeParse(tags);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the tags");
      return;
    }
    startTransition(async () => {
      const res = await confirmItemTags(item.id, parsed.data);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved — generating outfit combinations…");
      // Fire-and-forget: the combination engine works in the background.
      fetch("/api/combinations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      }).catch(() => {});
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
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Re-analyzed — review the fresh tags");
      router.refresh();
    } catch {
      toast.error("Re-analysis failed. Try again in a moment.");
    } finally {
      setReanalyzing(false);
    }
  }

  function archive() {
    startTransition(async () => {
      const res = await archiveItem(item.id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Archived");
      router.push("/wardrobe");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={tags.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              value={tags.color_name}
              onChange={(e) => set("color_name", e.target.value)}
              placeholder="navy"
            />
            <input
              type="color"
              aria-label="Color swatch"
              className="h-9 w-12 cursor-pointer rounded-md border bg-transparent"
              value={tags.color_hex}
              onChange={(e) => set("color_hex", e.target.value)}
            />
          </div>
        </div>
      </div>

      <ChipGroup
        label="Category"
        options={[...CATEGORIES]}
        value={tags.category}
        onChange={(v) => {
          set("category", v as Category);
          set("subcategory", "");
        }}
      />

      <ChipGroup
        label="Type"
        options={SUBCATEGORIES[tags.category as Category] ?? []}
        value={tags.subcategory}
        onChange={(v) => set("subcategory", v as string)}
      />

      <ChipGroup
        label="Material"
        options={[...MATERIALS]}
        value={tags.material}
        onChange={(v) => set("material", v as string)}
      />

      <ChipGroup
        label="Pattern"
        options={[...PATTERNS]}
        value={tags.pattern}
        onChange={(v) => set("pattern", v as string)}
      />

      <ChipGroup
        label="Seasons"
        options={[...SEASONS]}
        value={tags.season}
        onChange={(v) => set("season", v as string[])}
        multiple
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">
            Formality ({tags.formality_level}/10)
          </Label>
          <Slider
            className="mt-3"
            min={1}
            max={10}
            step={1}
            value={[tags.formality_level]}
            onValueChange={([v]) => set("formality_level", v)}
            aria-label="Formality level"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">
            Old money fit ({tags.old_money_score}/10)
          </Label>
          <Slider
            className="mt-3"
            min={1}
            max={10}
            step={1}
            value={[tags.old_money_score]}
            onValueChange={([v]) => set("old_money_score", v)}
            aria-label="Old money score"
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
          {item.ai_status === "confirmed" ? "Save changes" : "Confirm tags"}
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
          Re-analyze
        </Button>
        <Button
          variant="ghost"
          onClick={archive}
          disabled={pending || reanalyzing}
          className="gap-2 text-muted-foreground"
        >
          <Archive className="size-4" aria-hidden /> Archive
        </Button>
      </div>
    </div>
  );
}
