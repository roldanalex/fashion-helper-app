"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface StatusResponse {
  items: { id: string; name: string; combo_status: string }[];
  totalCombinations: number;
  generating: boolean;
}

/**
 * Polls generation status while any item is queued/generating and
 * announces newly created outfits.
 */
export function GenerationWatcher() {
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
          `Outfit generation failed for ${failed[0].name} — retry from its page`,
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

  return null;
}
