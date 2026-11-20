/**
 * Languages Aether speaks. English is the source; every other language falls
 * back to English for any key it is missing. Pure and client-safe.
 */
export const LOCALES = ["en", "es", "pt-BR", "fr", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the chosen language (also saved on the profile when signed in). */
export const LOCALE_COOKIE = "aether-locale";

/** Each language named in itself, for the picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  fr: "Français",
  it: "Italiano",
};

/** How AI prompts name the language to answer in. */
export const AI_LANGUAGE: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  "pt-BR": "Brazilian Portuguese",
  fr: "French",
  it: "Italian",
};

/**
 * Message namespaces, one JSON file per namespace per language under
 * messages/<locale>/<namespace>.json. Add a namespace here and create the
 * English file; other languages fall back to English until translated.
 */
export const NAMESPACES = [
  "common",
  "nav",
  "landing",
  "onboarding",
  "personal",
  "taxonomy",
  "wardrobe",
  "outfits",
  "today",
  "stylist",
  "shop",
  "settings",
  "people",
  "family",
  "admin",
  "validation",
] as const;

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Best supported language from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    // Any Portuguese reads Brazilian Portuguese rather than English.
    if (base === "pt") return "pt-BR";
    const hit = LOCALES.find((l) => l.toLowerCase() === tag || l.toLowerCase() === base);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

/** The instruction every AI prompt carries so its words come back in the user's language. */
export function aiLanguageRule(locale: Locale | string | null | undefined): string {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (l === "en") return "";
  return `Write every word meant for the client in ${AI_LANGUAGE[l]}. Keep ids, enum values and JSON keys exactly as given.`;
}
