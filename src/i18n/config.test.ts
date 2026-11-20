import { describe, expect, it } from "vitest";
import { aiLanguageRule, isLocale, localeFromAcceptLanguage } from "@/i18n/config";

describe("localeFromAcceptLanguage", () => {
  it("picks the best supported language by quality", () => {
    expect(localeFromAcceptLanguage("es-PR,es;q=0.9,en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("de-DE,fr;q=0.7,en;q=0.5")).toBe("fr");
    expect(localeFromAcceptLanguage("en;q=0.2,it;q=0.9")).toBe("it");
  });

  it("maps any Portuguese to Brazilian Portuguese", () => {
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt-BR");
    expect(localeFromAcceptLanguage("pt-PT")).toBe("pt-BR");
  });

  it("falls back to English", () => {
    expect(localeFromAcceptLanguage(null)).toBe("en");
    expect(localeFromAcceptLanguage("de-DE,ja;q=0.9")).toBe("en");
  });
});

describe("aiLanguageRule", () => {
  it("asks for the client's language, and nothing for English", () => {
    expect(aiLanguageRule("en")).toBe("");
    expect(aiLanguageRule("es")).toContain("Spanish");
    expect(aiLanguageRule("pt-BR")).toContain("Brazilian Portuguese");
    expect(aiLanguageRule("xx")).toBe("");
  });

  it("keeps ids and enum values untranslated", () => {
    expect(aiLanguageRule("fr")).toMatch(/ids, enum values and JSON keys/);
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("it")).toBe(true);
    expect(isLocale("pt")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
