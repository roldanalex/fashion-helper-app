import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { generateCombinationsForItem } from "@/lib/combinations/generate";
import type { ClothingItem } from "@/types/database";

// Smart "fill the gaps" build: finish generation for any confirmed pieces
// whose outfits never got built (e.g. the auto fire-and-forget was dropped
// when the user navigated away). Reuses the per-item engine; idempotent.
export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const { data, error } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("archived", false)
    .eq("ai_status", "confirmed")
    .neq("combo_status", "done");
  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: "Could not read your wardrobe." } },
      { status: 500 },
    );
  }

  const pending = (data ?? []) as ClothingItem[];

  // Mark everything queued up-front so the status banner reflects the work
  // immediately, even before the first item finishes.
  if (pending.length > 0) {
    await supabase
      .from("clothing_items")
      .update({ combo_status: "queued" })
      .in(
        "id",
        pending.map((i) => i.id),
      );
  }

  let processed = 0;
  let inserted = 0;
  for (const item of pending) {
    try {
      const result = await generateCombinationsForItem(supabase, user.id, item.id);
      inserted += result.inserted;
      processed += 1;
    } catch (err) {
      console.error(`Build failed for item ${item.id}:`, err);
      // generateCombinationsForItem already marks this item 'failed'; keep going.
    }
  }

  return NextResponse.json({ processed, inserted });
}
