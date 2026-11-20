import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { analyzeItemImage } from "@/lib/ai/tagging";
import { personSessionOr404 } from "@/lib/people/session";
import { getTranslations } from "next-intl/server";

export const maxDuration = 60;

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
  const t = await getTranslations("wardrobe.errors");
  const { wardrobe } = session;
  const item = await wardrobe.piece(itemId);
  if (!item) {
    return NextResponse.json(
      { error: { code: "not_found", message: t("itemNotFound") } },
      { status: 404 },
    );
  }

  const { data: signed } = await supabase.storage
    .from("wardrobe")
    .createSignedUrl(item.image_url, 300);
  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: { code: "storage", message: t("couldNotReadPhoto") } },
      { status: 500 },
    );
  }

  try {
    // Only the photo of the piece and the owner's own description are sent;
    // nothing about the Person (docs/adr/0002).
    const tags = await analyzeItemImage({
      imageUrl: signed.signedUrl,
      userDescription: item.description,
      categoryHint: item.category,
    });

    const ok = await wardrobe.updatePiece(itemId, { ...tags, ai_status: "tagged" });
    if (!ok) throw new Error("update failed");

    return NextResponse.json({ tags });
  } catch (err) {
    console.error("Item analysis failed:", err);
    await wardrobe.updatePiece(itemId, { ai_status: "failed" }).catch(() => false);
    return NextResponse.json(
      {
        error: {
          code: "ai_failed",
          message: t("aiFailed"),
        },
      },
      { status: 502 },
    );
  }
}
