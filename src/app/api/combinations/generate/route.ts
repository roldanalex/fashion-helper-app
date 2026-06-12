import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCombinationsForItem } from "@/lib/combinations/generate";

// Batched LLM scoring can take a few minutes on a big wardrobe.
export const maxDuration = 300;

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

  const { itemId } = await request.json().catch(() => ({}));
  if (!itemId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "itemId is required" } },
      { status: 400 },
    );
  }

  try {
    const result = await generateCombinationsForItem(supabase, user.id, itemId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Combination generation failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "generation_failed",
          message: "Outfit generation failed. You can retry from the item page.",
        },
      },
      { status: 502 },
    );
  }
}
