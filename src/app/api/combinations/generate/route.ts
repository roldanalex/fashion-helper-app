import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { generateCombinationsForItem } from "@/lib/combinations/generate";
import { personSessionOr404 } from "@/lib/people/session";
import { aiLanguageRule } from "@/i18n/config";
import { getTranslations } from "next-intl/server";

// Batched LLM scoring can take a few minutes on a big wardrobe.
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const { itemId, personId } = await request.json().catch(() => ({}));
  if (!itemId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "itemId is required" } },
      { status: 400 },
    );
  }

  const { session, deny: notFound } = await personSessionOr404(supabase, user, personId);
  if (notFound) return notFound;

  try {
    const result = await generateCombinationsForItem(
      session.wardrobe,
      session.active.subject,
      session.active.styles,
      itemId,
      aiLanguageRule(session.locale),
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("Combination generation failed:", err);
    const t = await getTranslations("outfits.errors");
    return NextResponse.json(
      {
        error: {
          code: "generation_failed",
          message: t("generationFailed"),
        },
      },
      { status: 502 },
    );
  }
}
