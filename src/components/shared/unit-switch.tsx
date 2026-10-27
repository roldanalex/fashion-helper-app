"use client";

import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";
import type { Units } from "@/lib/units";

const OPTIONS: { value: Units; symbol: string; name: string }[] = [
  { value: "metric", symbol: "°C", name: "Celsius" },
  { value: "imperial", symbol: "°F", name: "Fahrenheit" },
];

/**
 * Two-way °C / °F control. A radio group, so arrow keys move between the
 * options and screen readers announce "Celsius, selected". The compact size
 * sits inside the weather chip; the full size names the units for Settings.
 */
export function UnitSwitch({
  value,
  onChange,
  size = "full",
  className,
  "aria-labelledby": labelledBy,
}: {
  value: Units;
  onChange: (next: Units) => void;
  size?: "compact" | "full";
  className?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onChange(v as Units)}
      orientation="horizontal"
      aria-label={labelledBy ? undefined : "Temperature unit"}
      aria-labelledby={labelledBy}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border bg-muted/40 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          aria-label={o.name}
          title={o.name}
          className={cn(
            // after: widens the hit area to ~44px tall without changing the look
            "relative cursor-pointer rounded-full font-medium tabular-nums text-muted-foreground outline-none transition-colors duration-200 after:absolute after:inset-x-0 after:-inset-y-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:text-primary-foreground",
            size === "compact" ? "h-6 px-2 text-xs" : "h-8 px-3.5 text-sm",
          )}
        >
          {size === "compact" ? (
            o.symbol
          ) : (
            <>
              {o.symbol}
              <span className="ml-1.5 font-normal">{o.name}</span>
            </>
          )}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
