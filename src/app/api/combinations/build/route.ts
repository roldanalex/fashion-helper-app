import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { generateCombinationsForItem } from "@/lib/combinations/generate";
import { personSessionOr404 } from "@/lib/people/session";
import { aiLanguageRule } from "@/i18n/config";

// Smart "fill the gaps" build for one Person: finish generation for any
// confirmed pieces whose outfits never got built (e.g. the auto
// fire-and-forget was dropped when the user navigated away). Idempotent.
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const { personId } = await request.json().catch(() => ({}));

  const { session, deny: notFound } = await personSessionOr404(supabase, user, personId);
  if (notFound) return notFound;
  const { wardrobe, active } = session;

  const pending = (await wardrobe.pieces({ confirmed: true })).filter(
    (p) => p.combo_status !== "done",
  );

  // Mark everything queued up-front so the status banner reflects the work
  // immediately, even before the first piece finishes.
  await wardrobe.setComboStatus(
    pending.map((p) => p.id),
    "queued",
  );

  let processed = 0;
  let inserted = 0;
  for (const item of pending) {
    try {
      const result = await generateCombinationsForItem(
        wardrobe,
        active.subject,
        active.styles,
        item.id,
        aiLanguageRule(session.locale),
      );
      inserted += result.inserted;
      processed += 1;
    } catch (err) {
      console.error(`Build failed for piece ${item.id}:`, err);
      // generateCombinationsForItem already marks this piece 'failed'; keep going.
    }
  }

  return NextResponse.json({ processed, inserted });
}
