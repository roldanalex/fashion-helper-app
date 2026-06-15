"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Kicks off the smart fill-gaps build, then wakes the app-wide
 * GenerationBanner (by invalidating its status query) so progress is visible.
 * Fire-and-forget: the banner reports completion, surviving navigation.
 */
export function RebuildOutfitsButton({
  label = "Build outfits",
  size = "default",
  variant = "default",
}: {
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}) {
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);

  async function build() {
    setStarting(true);
    try {
      const res = await fetch("/api/combinations/build", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Could not start the build");
      }
      toast.success("On it — the stylist is building your outfits");
      // Wake the status banner so it starts polling immediately.
      queryClient.invalidateQueries({ queryKey: ["combination-status"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the build");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Button size={size} variant={variant} className="gap-2" onClick={build} disabled={starting}>
      {starting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-4" aria-hidden />
      )}
      {label}
    </Button>
  );
}
