import Link from "next/link";
import { AetherLogo } from "@/components/shared/aether-logo";
import { Camera, CloudSun, Shirt, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GoogleSignIn } from "@/components/shared/google-sign-in";
import { HeroVisual } from "@/components/three/HeroSection";
import { TiltCard } from "@/components/shared/tilt-card";
import { LanguagePicker } from "@/components/shared/language-picker";
import { APP_CREDIT, APP_VERSION } from "@/lib/constants";

const features = [
  { icon: Camera, key: "photograph" },
  { icon: Sparkles, key: "curated" },
  { icon: CloudSun, key: "dressed" },
  { icon: Shirt, key: "grow" },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  return (
    <main className="relative flex min-h-dvh flex-col">
      <HeroVisual />

      <header className="relative z-10 flex items-center justify-between px-6 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-12">
        <AetherLogo className="h-10 md:h-12" />
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/welcome"
            className="hidden min-h-11 items-center px-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            {t("howItWorks")}
          </Link>
          <LanguagePicker className="h-9 w-auto text-sm" />
          <GoogleSignIn variant="outline" label={t("signIn")} />
        </div>
      </header>

      <section className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 md:px-12">
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="text-balance text-5xl leading-[1.05] md:text-7xl">
            {t("headline")}
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg text-muted-foreground">
            {t("lede")}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <GoogleSignIn />
            <Link
              href="/welcome"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t("seeHowItWorks")}
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 md:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, key }) => (
            <TiltCard
              key={key}
              className="rounded-xl border bg-card/80 p-6 backdrop-blur transition-colors duration-200 hover:bg-accent/60"
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-4 font-serif text-xl">{t(`features.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`features.${key}.body`)}
              </p>
            </TiltCard>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t px-6 py-6 text-center text-xs text-muted-foreground md:px-12">
        <p>{t("footer")}</p>
        <p className="mt-1">
          v{APP_VERSION} · {APP_CREDIT}
        </p>
      </footer>
    </main>
  );
}
