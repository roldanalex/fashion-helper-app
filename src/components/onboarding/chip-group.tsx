"use client";

import { cn } from "@/lib/utils";

interface ChipOption {
  value: string;
  label: string;
}

export function ChipGroup({
  label,
  options,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  options: readonly ChipOption[] | readonly string[];
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}) {
  const opts: ChipOption[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const selected = new Set(
    Array.isArray(value) ? value : value ? [value] : [],
  );

  function toggle(v: string) {
    if (multiple) {
      const next = new Set(selected);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      onChange([...next]);
    } else {
      onChange(v);
    }
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opts.map(({ value: v, label: l }) => {
          const active = selected.has(v);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(v)}
              className={cn(
                "min-h-10 cursor-pointer rounded-full border px-4 text-sm capitalize transition-colors duration-200",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {l}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
