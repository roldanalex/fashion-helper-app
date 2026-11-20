"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  Check,
  Loader2,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useTaxonomy } from "@/i18n/taxonomy";
import { updateSuggestionStatus } from "@/app/(app)/shop/actions";
import type { CategoryGap } from "@/lib/gap-analysis";
import type { ShoppingSuggestion } from "@/types/database";

/** The shopper needs a few confirmed pieces to judge what is missing (see /api/shop/analyze). */
const MIN_PIECES_FOR_SUGGESTIONS = 3;

export function ShopClient({
  personId,
  gaps,
  wardrobeCount,
  suggestions,
}: {
  /** The Active person. */
  personId: string;
  gaps: CategoryGap[];
  wardrobeCount: number;
  suggestions: ShoppingSuggestion[];
}) {
  const t = useTranslations("shop");
  const tx = useTaxonomy();
  /** Shop's own plural labels (shop.categories.*), falling back to the taxonomy. */
  const categoryLabel = (category: string) =>
    t.has(`categories.${category}`) ? t(`categories.${category}`) : tx("categoryPlural", category);
  const tooFewPieces = wardrobeCount < MIN_PIECES_FOR_SUGGESTIONS;
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const maxUnlocks = Math.max(1, ...gaps.map((g) => g.unlocks));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shop/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: [...selected], personId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? t("errors.analysisFailed"));
      return json;
    },
    onSuccess: () => {
      toast.success(t("toasts.fresh"));
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggle(category: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function setStatus(
    s: ShoppingSuggestion,
    status: "suggested" | "saved" | "dismissed" | "purchased",
  ) {
    const previous = s.status;
    startTransition(async () => {
      const res = await updateSuggestionStatus(s.id, status, personId);
      if (res?.error) {
        toast.error(res.error);
      } else if (status === "purchased") {
        toast.success(t("toasts.purchased"), {
          action: { label: t("toasts.undo"), onClick: () => setStatus(s, previous) },
        });
      } else if (status === "saved") {
        toast.success(t("toasts.saved", { name: s.item_name }));
      } else if (status === "dismissed") {
        toast.success(t("toasts.dismissed", { name: s.item_name }), {
          action: { label: t("toasts.undo"), onClick: () => setStatus(s, previous) },
        });
      } else {
        toast.success(t("toasts.restored", { name: s.item_name }));
      }
      router.refresh();
    });
  }

  const open = suggestions.filter(
    (s) => s.status === "suggested" || s.status === "saved",
  );
  const dismissed = suggestions.filter((s) => s.status === "dismissed");

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-2xl">{t("gaps.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("gaps.subtitle")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gaps.map((gap) => (
            <label
              key={gap.category}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors duration-200",
                selected.has(gap.category)
                  ? "border-primary/60 bg-primary/5"
                  : "hover:border-primary/30",
              )}
            >
              <Checkbox
                checked={selected.has(gap.category)}
                onCheckedChange={() => toggle(gap.category)}
                aria-label={categoryLabel(gap.category)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {categoryLabel(gap.category)}
                  </span>
                  {gap.bottleneck && (
                    <Badge className="bg-primary/15 text-primary">
                      {t("gaps.bestValue")}
                    </Badge>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t("gaps.stats", { owned: gap.owned, unlocks: gap.unlocks })}
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-secondary" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${(gap.unlocks / maxUnlocks) * 100}%` }}
                  />
                </span>
              </span>
            </label>
          ))}
        </div>

        <Button
          className="mt-5 gap-2"
          size="lg"
          disabled={tooFewPieces || selected.size === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("actions.consulting")}
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden /> {t("actions.getSuggestions")}
            </>
          )}
        </Button>
        {tooFewPieces && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("actions.tooFew", { min: MIN_PIECES_FOR_SUGGESTIONS, count: wardrobeCount })}
          </p>
        )}
      </section>

      {open.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl">{t("suggestions.title")}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {open.map((s) => (
              <article
                key={s.id}
                className="flex flex-col rounded-xl border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl">{s.item_name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="capitalize">
                        {s.subcategory ? tx("subcategory", s.subcategory) : tx("category", s.category)}
                      </Badge>
                      {s.color_name && (
                        <span className="text-xs capitalize text-muted-foreground">
                          {s.color_name}
                        </span>
                      )}
                      {s.status === "saved" && (
                        <Badge variant="outline" className="text-primary">
                          {t("suggestions.saved")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {s.estimated_new_combinations != null && (
                    <div className="shrink-0 text-right">
                      <p className="font-serif text-2xl text-primary">
                        +{s.estimated_new_combinations}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("suggestions.potentialOutfits")}
                      </p>
                    </div>
                  )}
                </div>

                {s.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                )}
                {s.reason && (
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    {s.reason}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={pending}
                    onClick={() => setStatus(s, "purchased")}
                  >
                    <Check className="size-3.5" aria-hidden /> {t("suggestions.bought")}
                  </Button>
                  {s.status !== "saved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      disabled={pending}
                      onClick={() => setStatus(s, "saved")}
                    >
                      <Bookmark className="size-3.5" aria-hidden /> {t("suggestions.save")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    disabled={pending}
                    onClick={() => setStatus(s, "dismissed")}
                  >
                    <X className="size-3.5" aria-hidden /> {t("suggestions.notForMe")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {open.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
          <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            {t("empty.body")}
          </p>
        </div>
      )}

      {dismissed.length > 0 && (
        <details className="rounded-xl border bg-card/40">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm text-muted-foreground">
            {t("dismissed.title", { count: dismissed.length })}
          </summary>
          <ul className="divide-y border-t">
            {dismissed.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-sm">{s.item_name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  disabled={pending}
                  onClick={() => setStatus(s, "suggested")}
                >
                  <RotateCcw className="size-3.5" aria-hidden /> {t("dismissed.bringBack")}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
