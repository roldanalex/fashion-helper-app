"use client";

import { useTranslations } from "next-intl";

/** Translates a schema validation key (see messages/<locale>/validation.json); other text passes through. */
export function useValidationMessage() {
  const t = useTranslations("validation");
  return (message: string | undefined | null, fallback: string): string =>
    message ? (t.has(message) ? t(message) : message) : fallback;
}
