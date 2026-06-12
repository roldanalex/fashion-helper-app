"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";

function StaticFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_70%_40%,oklch(0.35_0.05_84/0.45),transparent_70%)]"
    />
  );
}

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <StaticFallback />,
});

export function HeroVisual() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <StaticFallback />
      {!reducedMotion && (
        <div className="absolute inset-0 opacity-0 animate-[fade-in_1.2s_ease_forwards] [animation-delay:200ms] md:translate-x-[18%]">
          <HeroScene />
        </div>
      )}
    </div>
  );
}
