"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { ArrowUp, Loader2, MessageCircle, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReadinessBanner } from "@/components/wardrobe/readiness-banner";
import { MessageText } from "@/components/stylist/message-text";
import { TripPlanCard } from "@/components/stylist/trip-plan-card";
import { OutfitOptionsCard } from "@/components/stylist/outfit-options-card";
import type { WardrobeReadiness } from "@/lib/combinations/readiness";
import type { StylistUIMessage } from "@/lib/trips/chat-types";

const STORED_MESSAGES = 40;

const STARTERS = [
  "Pack for three days in Lisbon: work Thursday and Friday, dinner on Friday, sightseeing Saturday.",
  "A five-day conference trip to Chicago next month, carry-on only. Can I do it with one pair of shoes?",
  "What goes with my navy blazer for dinner on Friday? I'd like to wear the brown loafers.",
];

/** The client's calendar date, not the server's. */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function StylistChat({
  userId,
  hasCombinations,
  readiness,
}: {
  userId: string;
  hasCombinations: boolean;
  readiness: WardrobeReadiness;
}) {
  const storageKey = `aether-stylist:${userId}`;
  const [input, setInput] = useState("");
  const [restored, setRestored] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error, setMessages, regenerate } =
    useChat<StylistUIMessage>({
      transport: new DefaultChatTransport({
        api: "/api/stylist/chat",
        body: () => ({ today: localToday() }),
      }),
      onError: (err) => toast.error(err.message || "The stylist is unavailable. Try again."),
    });

  const busy = status === "submitted" || status === "streaming";

  // Keep the conversation across reloads and tab switches, per account.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {
      // Storage unavailable or corrupt: start fresh.
    }
    setRestored(true);
  }, [storageKey, setMessages]);

  useEffect(() => {
    if (!restored || status !== "ready") return;
    try {
      if (messages.length === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(messages.slice(-STORED_MESSAGES)));
    } catch {
      // Quota or private mode: the conversation still works for this visit.
    }
  }, [messages, status, restored, storageKey]);

  // Follow the reply as it streams.
  useEffect(() => {
    if (busy) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  function startOver() {
    stop();
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  }

  function useStarter(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  if (!hasCombinations) {
    return (
      <div className="space-y-6 px-6 pb-10 md:px-10">
        <div className="flex flex-col items-center rounded-xl border border-dashed py-12 text-center">
          <MessageCircle className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-serif text-2xl">The stylist needs your outfits first</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {readiness.ready
              ? "Your pieces are in. Once the outfit table is built, come back and plan a trip."
              : "Trips are packed from your outfit table, which builds itself once you have confirmed the essentials below."}
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/wardrobe">Go to wardrobe</Link>
          </Button>
        </div>
        <ReadinessBanner readiness={readiness} />
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const awaitingReply = status === "submitted" && lastMessage?.role === "user";

  return (
    <div className="flex flex-1 flex-col px-6 md:px-10">
      <div className="mx-auto w-full max-w-3xl flex-1 pb-6">
        {messages.length === 0 ? (
          <div className="pt-2">
            <p className="max-w-xl font-serif text-xl leading-relaxed text-foreground/90 md:text-2xl">
              Tell me where you are going, for how long, and what the days hold. I will
              lay out one outfit per day from your own table and keep the suitcase small.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => useStarter(s)}
                    className="h-full w-full rounded-xl border bg-card p-4 text-left text-sm leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Edit the city and dates to match your trip. Every outfit comes from your Outfits table.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={startOver}
              >
                <RotateCcw aria-hidden /> Start over
              </Button>
            </div>
            <ol className="mt-2 space-y-7">
              {messages.map((message) => (
                <li key={message.id}>
                  <Message message={message} />
                </li>
              ))}
              {awaitingReply && (
                <li className="font-serif text-lg text-muted-foreground" aria-live="polite">
                  <span className="animate-pulse">Thinking it through…</span>
                </li>
              )}
              {error && status === "error" && (
                <li className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  The stylist did not answer.
                  <Button variant="outline" size="sm" onClick={() => regenerate()}>
                    Try again
                  </Button>
                </li>
              )}
            </ol>
          </>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer: sits above the mobile tab bar, flush with the bottom on desktop. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-6 bg-background/90 px-6 pb-4 pt-3 backdrop-blur md:bottom-0 md:-mx-10 md:px-10">
        <form
          className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border bg-card p-2 focus-within:border-ring"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="stylist-input" className="sr-only">
            Message the stylist
          </label>
          <Textarea
            id="stylist-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Where to, and what are the days like?"
            className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
            disabled={busy}
          />
          {busy ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => stop()}
              aria-label="Stop"
            >
              <Square className="size-3.5 fill-current" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <ArrowUp aria-hidden />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

function Message({ message }: { message: StylistUIMessage }) {
  if (message.role === "user") {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm leading-relaxed">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message.parts.map((part, i) => {
        switch (part.type) {
          case "text":
            return part.text.trim() ? (
              <MessageText
                key={i}
                text={part.text}
                className="max-w-prose font-serif text-lg leading-relaxed"
              />
            ) : null;
          case "tool-plan_trip": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <p
                    key={part.toolCallId}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Laying out
                    {part.input && "destination" in part.input && part.input.destination
                      ? ` ${part.input.destination}`
                      : " the trip"}
                    …
                  </p>
                );
              case "output-available":
                return part.output.ok ? (
                  <TripPlanCard key={part.toolCallId} plan={part.output.plan} />
                ) : (
                  <p
                    key={part.toolCallId}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    Couldn&apos;t lay this trip out yet
                  </p>
                );
              case "output-error":
                return (
                  <p key={part.toolCallId} className="text-sm text-muted-foreground">
                    {part.errorText || "The planner could not lay this trip out."}
                  </p>
                );
            }
            return null;
          }
          case "tool-find_outfits": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <p
                    key={part.toolCallId}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Looking through your outfits…
                  </p>
                );
              case "output-available":
                return part.output.ok ? (
                  <OutfitOptionsCard key={part.toolCallId} options={part.output.options} />
                ) : (
                  <p
                    key={part.toolCallId}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    Couldn&apos;t pull outfits for that yet
                  </p>
                );
              case "output-error":
                return (
                  <p key={part.toolCallId} className="text-sm text-muted-foreground">
                    {part.errorText || "The outfit lookup failed."}
                  </p>
                );
            }
            return null;
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

