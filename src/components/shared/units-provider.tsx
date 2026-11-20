"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateMeasureUnits, updateUnits } from "@/app/(app)/settings/actions";
import type { MeasureUnits, Units } from "@/lib/units";

interface UnitsContextValue {
  /** Temperature unit. */
  units: Units;
  /** Applies at once everywhere and saves to the profile in the background. */
  setUnits: (next: Units) => void;
  /** Weight and height units, each chosen on its own. */
  measures: MeasureUnits;
  setMeasures: (next: Partial<MeasureUnits>) => void;
  saving: boolean;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({
  initial,
  initialMeasures = { weight: initial === "imperial" ? "lb" : "kg", height: initial === "imperial" ? "ftin" : "cm" },
  children,
}: {
  initial: Units;
  initialMeasures?: MeasureUnits;
  children: React.ReactNode;
}) {
  const [units, setLocal] = useState<Units>(initial);
  const [measures, setMeasuresLocal] = useState<MeasureUnits>(initialMeasures);
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

  const setMeasures = useCallback((next: Partial<MeasureUnits>) => {
    setMeasuresLocal((prev) => {
      const merged = { ...prev, ...next };
      if (merged.weight === prev.weight && merged.height === prev.height) return prev;
      startTransition(async () => {
        const res = await updateMeasureUnits(merged);
        if (res?.error) {
          setMeasuresLocal(prev);
          toast.error(res.error);
        }
      });
      return merged;
    });
  }, []);

  return (
    <UnitsContext.Provider value={{ units, setUnits, measures, setMeasures, saving }}>
      {children}
    </UnitsContext.Provider>
  );
}

/** Falls back to °C outside the app shell (tests, previews). */
export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  return (
    ctx ?? {
      units: "metric",
      setUnits: () => {},
      measures: { weight: "kg", height: "cm" },
      setMeasures: () => {},
      saving: false,
    }
  );
}
