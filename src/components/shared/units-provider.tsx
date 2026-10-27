"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUnits } from "@/app/(app)/settings/actions";
import type { Units } from "@/lib/units";

interface UnitsContextValue {
  units: Units;
  /** Applies at once everywhere and saves to the profile in the background. */
  setUnits: (next: Units) => void;
  saving: boolean;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({
  initial,
  children,
}: {
  initial: Units;
  children: React.ReactNode;
}) {
  const [units, setLocal] = useState<Units>(initial);
  const [saving, startTransition] = useTransition();

  const setUnits = useCallback(
    (next: Units) => {
      setLocal((prev) => {
        if (prev === next) return prev;
        startTransition(async () => {
          const res = await updateUnits(next);
          if (res?.error) {
            setLocal(prev);
            toast.error(res.error);
          }
        });
        return next;
      });
    },
    [],
  );

  return (
    <UnitsContext.Provider value={{ units, setUnits, saving }}>
      {children}
    </UnitsContext.Provider>
  );
}

/** Falls back to °C outside the app shell (tests, previews). */
export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  return ctx ?? { units: "metric", setUnits: () => {}, saving: false };
}
