import { NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import {
  STYLIST_MODEL,
  STYLIST_REASONING_EFFORT,
  buildStylistSystemPrompt,
  stylistTools,
} from "@/lib/ai/stylist";
import { isIsoDate } from "@/lib/trips/dates";
import { STYLIST_HISTORY_LIMIT, STYLIST_MAX_MESSAGE_CHARS } from "@/lib/constants";
import type { StylistUIMessage } from "@/lib/trips/chat-types";
import type { ClothingItem } from "@/types/database";

export const maxDuration = 60;

/** Keep only what the model needs: recent turns, bounded text. */
function sanitize(messages: unknown): StylistUIMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m): m is StylistUIMessage =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        Array.isArray(m.parts),
    )
    .slice(-STYLIST_HISTORY_LIMIT)
    .map((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.type === "text" && p.text.length > STYLIST_MAX_MESSAGE_CHARS
          ? { ...p, text: p.text.slice(0, STYLIST_MAX_MESSAGE_CHARS) }
          : p,
      ),
    }));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const messages = sanitize(body?.messages);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: { code: "bad_request", message: "A message is required" } },
      { status: 400 },
    );
  }
  const today = isIsoDate(body?.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);

  const [{ data: wardrobeData }, { data: profile }] = await Promise.all([
    supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .eq("ai_status", "confirmed"),
    supabase
      .from("profiles")
      .select("style_preferences, preferred_formality, home_location, units")
      .eq("id", user.id)
      .single(),
  ]);

  const ctx = {
    supabase,
    userId: user.id,
    today,
    wardrobe: (wardrobeData ?? []) as ClothingItem[],
    profile,
  };

  const tools = stylistTools(ctx);
  const result = streamText({
    model: openai(STYLIST_MODEL),
    providerOptions: {
      openai: { reasoningEffort: STYLIST_REASONING_EFFORT },
    },
    system: buildStylistSystemPrompt(ctx),
    // Passing tools applies toModelOutput to earlier plans in the history,
    // so the model sees a compact summary rather than the full card payload.
    messages: await convertToModelMessages(messages, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    // One planning call plus the narration, with room for one refinement.
    stopWhen: stepCountIs(4),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("Stylist chat failed:", error);
      return "The stylist is unavailable right now. Try again shortly.";
    },
  });
}
