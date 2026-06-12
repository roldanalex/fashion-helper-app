import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Aether Wardrobe",
    template: "%s · Aether Wardrobe",
  },
  description:
    "Your personal AI stylist. Photograph your wardrobe, plan your day, and dress impeccably — whatever the weather.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#13110e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${cormorant.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
