import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { analyzeItemImage } from "@/lib/ai/tagging";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const { itemId } = await request.json().catch(() => ({}));
  if (!itemId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "itemId is required" } },
      { status: 400 },
    );
  }

  const { data: item } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();
  if (!item) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Item not found" } },
      { status: 404 },
    );
  }

  const { data: signed } = await supabase.storage
    .from("wardrobe")
    .createSignedUrl(item.image_url, 300);
  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: { code: "storage", message: "Could not read the photo" } },
      { status: 500 },
    );
  }

  try {
    const tags = await analyzeItemImage({
      imageUrl: signed.signedUrl,
      userDescription: item.description,
      categoryHint: item.category,
    });

    const { error } = await supabase
      .from("clothing_items")
      .update({ ...tags, ai_status: "tagged" })
      .eq("id", itemId)
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ tags });
  } catch (err) {
    console.error("Item analysis failed:", err);
    await supabase
      .from("clothing_items")
      .update({ ai_status: "failed" })
      .eq("id", itemId)
      .eq("user_id", user.id);
    return NextResponse.json(
      {
        error: {
          code: "ai_failed",
          message: "The stylist couldn't read this photo. Try re-analyzing.",
        },
      },
      { status: 502 },
    );
  }
}
