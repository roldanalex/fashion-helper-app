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

/** Pieces in the outfit: 3 required + outerwear + each accessory. */
function completeness(c: Combination): number {
  return 3 + (c.outerwear_id ? 1 : 0) + c.accessory_ids.length;
}

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
    .in("category", ["top", "bottom", "shoes", "outerwear", "accessory"])
    .order("name");
  const items = itemRows ?? [];
  const tops = items.filter((i) => i.category === "top");
  const bottoms = items.filter((i) => i.category === "bottom");
  const shoes = items.filter((i) => i.category === "shoes");
  const outerwear = items.filter((i) => i.category === "outerwear");
  const accessories = items.filter((i) => i.category === "accessory");

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
  if (params.outerwear) query = query.eq("outerwear_id", params.outerwear);
  if (params.accessory)
    query = query.contains("accessory_ids", [params.accessory]);

  const { data } = await query;
  let combos = (data ?? []) as Combination[];

  // Boosted first, then the most complete outfits (all five slots filled),
  // then by the occasion blend or overall score.
  const occasion = params.occasion as Occasion | undefined;
  const hasOccasion = !!occasion && occasion in OCCASION_WEIGHTS;
  if (hasOccasion) {
    combos = combos.filter((c) => occasionScore(c, occasion!) >= 6.5);
  }
  const rank = (c: Combination) =>
    hasOccasion ? occasionScore(c, occasion!) : c.overall_score;
  combos.sort(
    (a, b) =>
      Number(b.boosted) - Number(a.boosted) ||
      completeness(b) - completeness(a) ||
      rank(b) - rank(a),
  );

  const enriched = await enrichCombinations(supabase, combos);

  return (
    <main>
      <PageHeader
        title="Outfits"
        subtitle={`${combos.length} combinations worth wearing`}
      />

      <div className="space-y-6 px-6 pb-10 md:px-10">
        <Suspense>
          <FilterBar
            tops={tops}
            bottoms={bottoms}
            shoes={shoes}
            outerwear={outerwear}
            accessories={accessories}
          />
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
