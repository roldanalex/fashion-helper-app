"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OCCASIONS, SEASONS } from "@/lib/constants";

export interface ItemOption {
  id: string;
  name: string;
}

export function FilterBar({
  tops = [],
  bottoms = [],
  shoes = [],
}: {
  tops?: ItemOption[];
  bottoms?: ItemOption[];
  shoes?: ItemOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    router.replace(`/combinations?${next.toString()}`);
  }

  const itemFilters: { key: string; label: string; options: ItemOption[] }[] = [
    { key: "top", label: "top", options: tops },
    { key: "bottom", label: "bottom", options: bottoms },
    { key: "shoes", label: "pair of shoes", options: shoes },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Build-around-a-piece filters */}
      {itemFilters.map(
        ({ key, label, options }) =>
          options.length > 0 && (
            <Select
              key={key}
              value={params.get(key) ?? "all"}
              onValueChange={(v) => setParam(key, v)}
            >
              <SelectTrigger
                className="w-44"
                aria-label={`Filter by ${label}`}
              >
                <SelectValue placeholder={`Any ${label}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any {label}</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
      )}

      <Select
        value={params.get("occasion") ?? "all"}
        onValueChange={(v) => setParam("occasion", v)}
      >
        <SelectTrigger className="w-40" aria-label="Filter by occasion">
          <SelectValue placeholder="Occasion" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any occasion</SelectItem>
          {OCCASIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("season") ?? "all"}
        onValueChange={(v) => setParam("season", v)}
      >
        <SelectTrigger className="w-36" aria-label="Filter by season">
          <SelectValue placeholder="Season" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any season</SelectItem>
          {SEASONS.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("min") ?? "7"}
        onValueChange={(v) => setParam("min", v)}
      >
        <SelectTrigger className="w-32" aria-label="Minimum score">
          <SelectValue placeholder="Score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Score 7+</SelectItem>
          <SelectItem value="8">Score 8+</SelectItem>
          <SelectItem value="9">Score 9+</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="show-hidden"
          checked={params.get("hidden") === "1"}
          onCheckedChange={(v) => setParam("hidden", v ? "1" : "")}
        />
        <Label htmlFor="show-hidden" className="text-sm text-muted-foreground">
          Show hidden
        </Label>
      </div>
    </div>
  );
}
