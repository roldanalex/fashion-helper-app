"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * The 3D golden thread runs only where it is cheap and visible: a desktop-class
 * pointer on a md+ screen, motion allowed, and the hero on screen. Phones keep
 * the static gradient, which saves battery and the three.js download.
 */
export function HeroVisual() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [capable, setCapable] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const update = () => setCapable(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      <StaticFallback />
      {capable && !reducedMotion && (
        <div className="absolute inset-0 opacity-0 animate-[fade-in_1.2s_ease_forwards] [animation-delay:200ms] md:translate-x-[18%]">
          <HeroScene active={visible} />
        </div>
      )}
    </div>
  );
}
