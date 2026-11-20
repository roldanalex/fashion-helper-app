import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  NAMESPACES,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "@/i18n/config";

type Messages = Record<string, unknown>;

async function load(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        return [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const;
      } catch {
        return [ns, {}] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/** Missing keys in a translation fall back to English instead of showing a key. */
function withFallback(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object"
        ? withFallback(base[k] as Messages, v as Messages)
        : v;
  }
  return out;
}

/** The language comes from the cookie (set by the picker), then the browser, then English. */
export async function resolveLocale(): Promise<Locale> {
  try {
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) return fromCookie;
    return localeFromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const english = await load(DEFAULT_LOCALE);
  const messages = locale === DEFAULT_LOCALE ? english : withFallback(english, await load(locale));
  return {
    locale,
    messages,
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.warn("[i18n]", error.message);
    },
    getMessageFallback({ key, namespace }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
