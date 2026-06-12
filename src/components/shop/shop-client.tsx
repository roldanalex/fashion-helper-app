"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  Check,
  Loader2,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { updateSuggestionStatus } from "@/app/(app)/shop/actions";
import type { CategoryGap } from "@/lib/gap-analysis";
import type { ShoppingSuggestion } from "@/types/database";

const CATEGORY_LABELS: Record<string, string> = {
  top: "Shirts & polos",
  bottom: "Pants & shorts",
  outerwear: "Blazers & jackets",
  shoes: "Shoes",
  accessory: "Accessories",
};

export function ShopClient({
  gaps,
  suggestions,
}: {
  gaps: CategoryGap[];
  suggestions: ShoppingSuggestion[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const maxUnlocks = Math.max(1, ...gaps.map((g) => g.unlocks));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shop/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Analysis failed");
      return json;
    },
    onSuccess: () => {
      toast.success("Fresh suggestions from your personal shopper");
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

  function setStatus(id: string, status: "saved" | "dismissed" | "purchased") {
    startTransition(async () => {
      const res = await updateSuggestionStatus(id, status);
      if (res?.error) toast.error(res.error);
      else if (status === "purchased")
        toast.success("Wonderful — photograph it to add it to your wardrobe");
      router.refresh();
    });
  }

  const open = suggestions.filter(
    (s) => s.status === "suggested" || s.status === "saved",
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-2xl">Where one piece goes furthest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Counted against your actual wardrobe — tick what you&apos;re shopping
          for.
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
                aria-label={CATEGORY_LABELS[gap.category]}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {CATEGORY_LABELS[gap.category]}
                  </span>
                  {gap.bottleneck && (
                    <Badge className="bg-primary/15 text-primary">
                      Best value
                    </Badge>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {gap.owned} owned · up to {gap.unlocks} new outfits
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-secondary">
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
          disabled={selected.size === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Consulting your shopper…
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden /> Get suggestions
            </>
          )}
        </Button>
      </section>

      {open.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl">Worth adding</h2>
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
                        {s.subcategory ?? s.category}
                      </Badge>
                      {s.color_name && (
                        <span className="text-xs capitalize text-muted-foreground">
                          {s.color_name}
                        </span>
                      )}
                      {s.status === "saved" && (
                        <Badge variant="outline" className="text-primary">
                          Saved
                        </Badge>
                      )}
                    </div>
                  </div>
                  {s.estimated_new_combinations != null && (
                    <div className="shrink-0 text-right">
                      <p className="font-serif text-2xl text-primary">
                        +{s.estimated_new_combinations}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        potential outfits
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

                <div className="mt-4 flex items-center gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={pending}
                    onClick={() => setStatus(s.id, "purchased")}
                  >
                    <Check className="size-3.5" aria-hidden /> I bought it
                  </Button>
                  {s.status !== "saved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      disabled={pending}
                      onClick={() => setStatus(s.id, "saved")}
                    >
                      <Bookmark className="size-3.5" aria-hidden /> Save
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    disabled={pending}
                    onClick={() => setStatus(s.id, "dismissed")}
                  >
                    <X className="size-3.5" aria-hidden /> Not for me
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
            Tick the categories you&apos;re shopping for and your personal
            shopper will suggest specific pieces — each scored by how many new
            outfits it unlocks.
          </p>
        </div>
      )}
    </div>
  );
}
