import "server-only";
import { getTranslations } from "next-intl/server";

/** Server twin of useValidationMessage(). */
export async function validationMessage(message: string | undefined | null, fallback: string): Promise<string> {
  if (!message) return fallback;
  const t = await getTranslations("validation");
  return t.has(message) ? t(message) : message;
}
