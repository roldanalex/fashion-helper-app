"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface StatusResponse {
  items: { id: string; name: string; combo_status: string }[];
  totalCombinations: number;
  generating: boolean;
}

/**
 * App-wide, persistent status strip. Mounted once in AppShell (which survives
 * page navigation), so the "AI is working" state follows the user across tabs
 * even if they leave the page where generation started. Polls every 3s while
 * outfits are being woven; idle otherwise.
 */
export function GenerationBanner() {
  const router = useRouter();
  const prevTotal = useRef<number | null>(null);
  const wasGenerating = useRef(false);

  const { data } = useQuery<StatusResponse>({
    queryKey: ["combination-status"],
    queryFn: async () => {
      const res = await fetch("/api/combinations/status");
      if (!res.ok) throw new Error("status failed");
      return res.json();
    },
    refetchInterval: (query) =>
      query.state.data?.generating !== false ? 3000 : false,
  });

  useEffect(() => {
    if (!data) return;
    if (wasGenerating.current && !data.generating) {
      const delta =
        prevTotal.current != null
          ? data.totalCombinations - prevTotal.current
          : 0;
      if (delta > 0) {
        toast.success(
          `Wove ${delta} new ${delta === 1 ? "outfit" : "outfits"} into your table`,
        );
      }
      const failed = data.items.filter((i) => i.combo_status === "failed");
      if (failed.length > 0) {
        toast.error(
          `Some outfits couldn't be built — open Wardrobe and tap "Build outfits" to retry`,
        );
      }
      router.refresh();
    }
    if (data.generating) {
      if (prevTotal.current === null) prevTotal.current = data.totalCombinations;
    } else {
      prevTotal.current = data.totalCombinations;
    }
    wasGenerating.current = data.generating;
  }, [data, router]);

  if (!data?.generating) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 flex items-center justify-center gap-2.5 overflow-hidden border-b border-primary/20 bg-primary/10 px-4 py-2.5 text-sm text-primary backdrop-blur"
    >
      {/* sliding shimmer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/15 to-transparent"
      />
      <Sparkles className="size-4 animate-pulse" aria-hidden />
      <span className="relative font-medium">
        Aether is styling your wardrobe — weaving outfit combinations…
      </span>
    </div>
  );
}
