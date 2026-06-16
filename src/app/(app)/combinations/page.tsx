import { Suspense } from "react";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ComboCard } from "@/components/combinations/combo-card";
import { FilterBar } from "@/components/combinations/filter-bar";
import { enrichCombinations } from "@/lib/combinations/enrich";
import { createClient } from "@/lib/supabase/server";
import { OCCASION_WEIGHTS, type Occasion } from "@/lib/constants";
import type { Combination } from "@/types/database";

export const metadata = { title: "Outfits" };

function occasionScore(c: Combination, occasion: Occasion): number {
  const w = OCCASION_WEIGHTS[occasion];
  return (
    (c.work_score ?? 0) * w.work +
    (c.daily_score ?? 0) * w.daily +
    (c.formality_score ?? 0) * w.formality +
    (c.old_money_score ?? 0) * w.oldMoney
  );
}

export default async function CombinationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Confirmed pieces, to populate the "build around this item" filters.
  const { data: itemRows } = await supabase
    .from("clothing_items")
    .select("id, name, category")
    .eq("archived", false)
    .eq("ai_status", "confirmed")
    .in("category", ["top", "bottom", "shoes"])
    .order("name");
  const items = itemRows ?? [];
  const tops = items.filter((i) => i.category === "top");
  const bottoms = items.filter((i) => i.category === "bottom");
  const shoes = items.filter((i) => i.category === "shoes");

  let query = supabase
    .from("combinations")
    .select("*")
    .gte("overall_score", Number(params.min ?? 7))
    .order("boosted", { ascending: false })
    .order("overall_score", { ascending: false })
    .limit(120);

  if (params.hidden !== "1") query = query.eq("hidden", false);
  if (params.season) query = query.contains("season_suitability", [params.season]);
  if (params.top) query = query.eq("top_id", params.top);
  if (params.bottom) query = query.eq("bottom_id", params.bottom);
  if (params.shoes) query = query.eq("shoes_id", params.shoes);

  const { data } = await query;
  let combos = (data ?? []) as Combination[];

  const occasion = params.occasion as Occasion | undefined;
  if (occasion && occasion in OCCASION_WEIGHTS) {
    combos = combos
      .filter((c) => occasionScore(c, occasion) >= 6.5)
      .sort(
        (a, b) =>
          Number(b.boosted) - Number(a.boosted) ||
          occasionScore(b, occasion) - occasionScore(a, occasion),
      );
  }

  const enriched = await enrichCombinations(supabase, combos);

  return (
    <main>
      <PageHeader
        title="Outfits"
        subtitle={`${combos.length} combinations worth wearing`}
      />

      <div className="space-y-6 px-6 pb-10 md:px-10">
        <Suspense>
          <FilterBar tops={tops} bottoms={bottoms} shoes={shoes} />
        </Suspense>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
            <Layers className="size-8 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 font-serif text-2xl">No combinations yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Confirm a few wardrobe pieces and the stylist will weave your
              combination table — or relax the filters above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {enriched.map(({ combination, slots }) => (
              <ComboCard
                key={combination.id}
                combination={combination}
                slots={slots}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
