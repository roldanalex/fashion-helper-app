import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { analyzeGaps } from "@/lib/gap-analysis";
import { suggestPurchases } from "@/lib/ai/shopping";
import { CATEGORIES } from "@/lib/constants";
import { personSessionOr404 } from "@/lib/people/session";
import { aiLanguageRule } from "@/i18n/config";

export const maxDuration = 60;

export async function POST(request: Request) {
  const t = await getTranslations("shop");
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const selected: string[] = Array.isArray(body.categories)
    ? body.categories.filter((c: string) => (CATEGORIES as readonly string[]).includes(c))
    : [];
  if (selected.length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: t("errors.pickCategory") } },
      { status: 400 },
    );
  }

  const { session, deny: notFound } = await personSessionOr404(
    supabase,
    user,
    typeof body.personId === "string" ? body.personId : null,
  );
  if (notFound) return notFound;
  const { active } = session;
  const wardrobe = await session.wardrobe.pieces({ confirmed: true });

  if (wardrobe.length < 3) {
    return NextResponse.json(
      {
        error: {
          code: "too_few_items",
          message: t("errors.tooFewItems"),
        },
      },
      { status: 422 },
    );
  }

  const gaps = analyzeGaps(wardrobe, active.formality);

  try {
    const result = await suggestPurchases({
      wardrobe,
      gaps,
      selectedCategories: selected,
      subject: active.subject,
      languageRule: aiLanguageRule(session.locale),
    });

    const unlocksByCategory = new Map(gaps.map((g) => [g.category, g.unlocks]));

    // Refresh open suggestions for the selected categories.
    const rows = result.suggestions
      .filter((s) => selected.includes(s.category))
      .map((s) => ({
        category: s.category,
        subcategory: s.subcategory,
        item_name: s.item_name,
        description: s.description,
        reason: s.reason,
        color_name: s.color_name,
        estimated_new_combinations: unlocksByCategory.get(s.category) ?? null,
      }));
    const inserted = await session.wardrobe.replaceSuggestions(selected, rows);

    return NextResponse.json({ suggestions: inserted });
  } catch (err) {
    console.error("Shopping analysis failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "ai_failed",
          message: t("errors.aiFailed"),
        },
      },
      { status: 502 },
    );
  }
}
