"use client";

import { useId } from "react";
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
  allowDeselect = false,
  hint,
  swatches,
}: {
  label: string;
  options: readonly ChipOption[] | readonly string[];
  value: string | string[] | null | undefined;
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  /** Single choice only: tapping the chosen chip again clears it (sends ""). */
  allowDeselect?: boolean;
  /** Help text read with the group. */
  hint?: string;
  /** Optional colour dot per option value. */
  swatches?: Partial<Record<string, string>>;
}) {
  const hintId = useId();
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
    } else if (allowDeselect && selected.has(v)) {
      onChange("");
    } else {
      onChange(v);
    }
  }

  return (
    <fieldset aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-2 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
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
                "min-h-10 cursor-pointer rounded-full border px-4 pointer-coarse:min-h-11 text-sm capitalize transition-colors duration-200",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {swatches?.[v] && (
                <span
                  className="mr-2 inline-block size-3 rounded-full border border-foreground/20 align-[-1px]"
                  style={{ backgroundColor: swatches[v] }}
                  aria-hidden
                />
              )}
              {l}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
