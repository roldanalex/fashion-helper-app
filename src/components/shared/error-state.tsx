"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Shared body for route error boundaries: says what happened and offers a retry. */
export function ErrorState({
  error,
  reset,
  fullScreen = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  fullScreen?: boolean;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className={
        fullScreen
          ? "flex min-h-dvh flex-col items-center justify-center px-6 text-center"
          : "flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      }
    >
      <h1 className="text-3xl">A loose thread</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page did not load. Your wardrobe and outfits are safe. Try again, and if it
        keeps happening, sign out and back in.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
      {error.digest && (
        <p className="mt-6 text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
    </main>
  );
}
