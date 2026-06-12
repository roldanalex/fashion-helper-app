import Link from "next/link";
import { Camera, CloudSun, Shirt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/three/HeroSection";

const features = [
  {
    icon: Camera,
    title: "Photograph your wardrobe",
    body: "Snap each piece once. The AI reads the cut, color, pattern and material — pique, knit, wool — and files it perfectly.",
  },
  {
    icon: Sparkles,
    title: "Curated combinations",
    body: "Every new item is scored against everything you own. Only combinations worth wearing make the table.",
  },
  {
    icon: CloudSun,
    title: "Dressed for the day",
    body: "Tell it where you're going — work, dinner, the park. It checks the weather there and picks what suits the occasion.",
  },
  {
    icon: Shirt,
    title: "Grow with intention",
    body: "See exactly which purchase unlocks the most new outfits before you buy it. No more orphan pieces.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <HeroVisual />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <span className="font-serif text-xl tracking-wide">
          Aether <span className="text-primary">Wardrobe</span>
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href="/today">Sign in</Link>
        </Button>
      </header>

      <section className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 md:px-12">
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-primary">
            Your personal AI stylist
          </p>
          <h1 className="text-balance text-5xl leading-[1.05] md:text-7xl">
            Dress impeccably, every single day.
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg text-muted-foreground">
            Aether Wardrobe studies your clothes, your plans and the weather —
            then lays out the outfit. Quiet luxury, zero guesswork.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/today">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81"
                  />
                </svg>
                Continue with Google
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Free while in beta
            </span>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 md:px-12">
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border/50 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-card/80 p-6 backdrop-blur transition-colors duration-200 hover:bg-accent/60"
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-4 font-serif text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t px-6 py-6 text-center text-xs text-muted-foreground md:px-12">
        Aether Wardrobe — woven with care.
      </footer>
    </main>
  );
}
