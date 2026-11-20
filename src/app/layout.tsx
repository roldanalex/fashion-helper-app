import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/shared/providers";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const description = t("meta.description");
  return {
    title: {
      default: "Aether Wardrobe",
      template: "%s · Aether Wardrobe",
    },
    description,
    applicationName: "Aether Wardrobe",
    appleWebApp: {
      capable: true,
      title: "Aether",
      statusBarStyle: "black",
    },
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      siteName: "Aether Wardrobe",
      title: "Aether Wardrobe",
      description,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // "cover" lets env(safe-area-inset-*) report the notch and home-indicator insets on iOS.
  viewportFit: "cover",
  themeColor: "#13110e",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html
      lang={locale}
      className={`dark ${cormorant.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
