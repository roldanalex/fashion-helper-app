"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemCard } from "@/components/wardrobe/item-card";
import { CATEGORIES, CATEGORY_PLURAL_LABELS, type Category } from "@/lib/constants";
import type { ClothingItem } from "@/types/database";

const STORAGE_KEY = "aether:wardrobe-sections";

type OpenMap = Partial<Record<Category, boolean>>;

/**
 * Wardrobe items grouped into collapsible category sections. Sections start
 * expanded (matching server HTML); the user's collapse choices persist in
 * localStorage so the layout is remembered across visits.
 */
export function WardrobeGrid({
  items,
  imageUrls,
}: {
  items: ClothingItem[];
  imageUrls: Record<string, string>;
}) {
  // Group once, preserving the incoming order (newest first) within a category.
  const groups = CATEGORIES.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  const [open, setOpen] = useState<OpenMap>({});

  // Hydrate saved collapse state after mount to avoid SSR mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOpen(JSON.parse(saved) as OpenMap);
    } catch {
      // ignore unavailable/corrupt storage
    }
  }, []);

  function toggle(category: Category) {
    setOpen((prev) => {
      const next = { ...prev, [category]: prev[category] === false };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {groups.map(({ category, items: categoryItems }) => {
        // Default open: a category is collapsed only when explicitly set false.
        const isOpen = open[category] !== false;
        const panelId = `wardrobe-section-${category}`;
        return (
          <section key={category} className="rounded-xl border bg-card/40">
            <button
              type="button"
              onClick={() => toggle(category)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent/40"
            >
              <span className="flex items-center gap-2.5">
                <span className="font-serif text-xl">
                  {CATEGORY_PLURAL_LABELS[category]}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {categoryItems.length}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {isOpen && (
              <div
                id={panelId}
                className="grid grid-cols-2 gap-4 p-4 pt-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              >
                {categoryItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    imageUrl={imageUrls[item.image_url]}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
