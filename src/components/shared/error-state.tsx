"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("nav");
  const tc = useTranslations("common");
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
      <h1 className="text-3xl">{t("error.title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("error.body")}
      </p>
      <Button onClick={reset} className="mt-6">
        {tc("tryAgain")}
      </Button>
      {error.digest && (
        <p className="mt-6 text-xs text-muted-foreground">{t("error.reference", { digest: error.digest })}</p>
      )}
    </main>
  );
}
