import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Static onboarding site (public/welcome) gets a clean URL, in the visitor's
  // language: /welcome follows the aether-locale cookie set by the language
  // picker; /welcome/es, /welcome/pt-BR, … open a language directly.
  async rewrites() {
    const translated = ["es", "pt-BR", "fr", "it"];
    return {
      beforeFiles: [
        ...translated.map((lang) => ({
          source: "/welcome",
          has: [{ type: "cookie" as const, key: "aether-locale", value: lang }],
          destination: `/welcome/index.${lang}.html`,
        })),
        ...translated.map((lang) => ({ source: `/welcome/${lang}`, destination: `/welcome/index.${lang}.html` })),
        { source: "/welcome/en", destination: "/welcome/index.html" },
        { source: "/welcome", destination: "/welcome/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
