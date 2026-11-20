"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

/**
 * Kicks off the smart fill-gaps build, then wakes the app-wide
 * GenerationBanner (by invalidating its status query) so progress is visible.
 * Fire-and-forget: the banner reports completion, surviving navigation.
 */
export function RebuildOutfitsButton({
  label,
  size = "default",
  variant = "default",
  personId,
}: {
  /** The Person whose outfits to build. */
  personId?: string;
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}) {
  const t = useTranslations("wardrobe.rebuild");
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);

  async function build() {
    setStarting(true);
    try {
      const res = await fetch("/api/combinations/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? t("couldNotStart"));
      }
      toast.success(t("started"));
      // Wake the status banner so it starts polling immediately.
      queryClient.invalidateQueries({ queryKey: ["combination-status"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("couldNotStart"));
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
      {label ?? t("label")}
    </Button>
  );
}
