"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface LocationResult {
  label: string;
  lat: number;
  lon: number;
}

/**
 * City autocomplete (Today's "Where?", home location at onboarding and in
 * Settings). An ARIA 1.2 combobox: focus stays in the input and the active
 * option is announced through aria-activedescendant. Debounced search against
 * /api/geocode; selecting a result hands back verified lat/lon so the
 * recommendation call skips re-geocoding (and can't mis-parse the input).
 */
export function LocationAutocomplete({
  id,
  value,
  placeholder,
  onChange,
  onSelect,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  value: string;
  placeholder?: string;
  /** Free-text edit — caller should clear any previously picked coords. */
  onChange: (text: string) => void;
  /** A verified place was chosen. */
  onSelect: (result: LocationResult) => void;
}) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const listId = useId();
  const optionId = (i: number) => `${listId}-option-${i}`;

  useEffect(() => {
    // Don't re-search the value we just auto-filled from a selection.
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        const list: LocationResult[] = json.results ?? [];
        setResults(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onDocPointer(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, []);

  function choose(r: LocationResult) {
    skipNextSearch.current = true;
    onSelect(r);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <MapPin
        className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        className="pl-9"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && (
        <Loader2
          className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching places"
        hidden={!open || results.length === 0}
        className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
      >
        {results.map((r, i) => (
          <li
            key={`${r.label}-${r.lat}-${r.lon}`}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // pointerdown keeps focus in the input; click alone would blur it first.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => choose(r)}
            onPointerEnter={() => setActive(i)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors",
              i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
            )}
          >
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
