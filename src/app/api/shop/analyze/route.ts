import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeGaps } from "@/lib/gap-analysis";
import { suggestPurchases } from "@/lib/ai/shopping";
import { CATEGORIES } from "@/lib/constants";
import type { ClothingItem } from "@/types/database";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not signed in" } },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const selected: string[] = Array.isArray(body.categories)
    ? body.categories.filter((c: string) => (CATEGORIES as readonly string[]).includes(c))
    : [];
  if (selected.length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Pick at least one category" } },
      { status: 400 },
    );
  }

  const [{ data: wardrobeData }, { data: profile }] = await Promise.all([
    supabase
      .from("clothing_items")
      .select("*")
      .eq("archived", false)
      .eq("ai_status", "confirmed"),
    supabase
      .from("profiles")
      .select("style_preferences, preferred_formality")
      .eq("id", user.id)
      .single(),
  ]);
  const wardrobe = (wardrobeData ?? []) as ClothingItem[];

  if (wardrobe.length < 3) {
    return NextResponse.json(
      {
        error: {
          code: "too_few_items",
          message: "Add at least a few pieces first so I know what to build on.",
        },
      },
      { status: 422 },
    );
  }

  const gaps = analyzeGaps(wardrobe, profile?.preferred_formality ?? null);

  try {
    const result = await suggestPurchases({
      wardrobe,
      gaps,
      selectedCategories: selected,
      stylePreferences: profile?.style_preferences ?? [],
      preferredFormality: profile?.preferred_formality ?? null,
    });

    const unlocksByCategory = new Map(gaps.map((g) => [g.category, g.unlocks]));

    // Refresh open suggestions for the selected categories.
    await supabase
      .from("shopping_suggestions")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "suggested")
      .in("category", selected);

    const rows = result.suggestions
      .filter((s) => selected.includes(s.category))
      .map((s) => ({
        user_id: user.id,
        category: s.category,
        subcategory: s.subcategory,
        item_name: s.item_name,
        description: s.description,
        reason: s.reason,
        color_name: s.color_name,
        estimated_new_combinations: unlocksByCategory.get(s.category) ?? null,
      }));

    const { data: inserted, error } = await supabase
      .from("shopping_suggestions")
      .insert(rows)
      .select();
    if (error) throw error;

    return NextResponse.json({ suggestions: inserted });
  } catch (err) {
    console.error("Shopping analysis failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "ai_failed",
          message: "The personal shopper is unavailable. Try again shortly.",
        },
      },
      { status: 502 },
    );
  }
}
