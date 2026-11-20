import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ComboCard } from "@/components/combinations/combo-card";
import { FilterBar } from "@/components/combinations/filter-bar";
import { enrichCombinations } from "@/lib/combinations/enrich";
import { personSession } from "@/lib/people/session";
import { redirect } from "next/navigation";
import { OCCASION_WEIGHTS, type Occasion } from "@/lib/constants";
import type { Combination } from "@/types/database";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("outfits");
  return { title: t("meta.title") };
}

/** Cards per page; "Show more" adds another page. Keeps image signing and phones light. */
const PAGE_SIZE = 24;

/** Pieces in the outfit: 3 required + outerwear + watch + each accessory. */
function completeness(c: Combination): number {
  return (
    3 + (c.outerwear_id ? 1 : 0) + (c.watch_id ? 1 : 0) + c.accessory_ids.length
  );
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
  const session = await personSession();
  if (!session) redirect("/");
  const { supabase, wardrobe, active } = session;

  // Confirmed pieces, to populate the "build around this item" filters.
  const items = (
    await wardrobe.pieces({
      confirmed: true,
      categories: ["top", "bottom", "shoes", "outerwear", "watch", "accessory"],
    })
  ).sort((a, b) => a.name.localeCompare(b.name));
  const tops = items.filter((i) => i.category === "top");
  const bottoms = items.filter((i) => i.category === "bottom");
  const shoes = items.filter((i) => i.category === "shoes");
  const outerwear = items.filter((i) => i.category === "outerwear");
  const watches = items.filter((i) => i.category === "watch");
  const accessories = items.filter((i) => i.category === "accessory");

  let combos = await wardrobe.outfits({
    minScore: Number(params.min ?? 7),
    includeHidden: params.hidden === "1",
    seasonsAny: params.season ? [params.season] : undefined,
    around: {
      top: params.top,
      bottom: params.bottom,
      shoes: params.shoes,
      outerwear: params.outerwear,
      watch: params.watch,
      accessory: params.accessory,
    },
    limit: 120,
  });

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

  const filtered = ["top", "bottom", "shoes", "outerwear", "watch", "accessory", "occasion", "season", "hidden"].some(
    (k) => !!params[k],
  ) || (params.min !== undefined && params.min !== "7");
  const shown = Math.max(PAGE_SIZE, Math.min(Number(params.show) || PAGE_SIZE, 120));
  const enriched = await enrichCombinations(supabase, wardrobe, combos.slice(0, shown));
  const moreParams = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  moreParams.set("show", String(shown + PAGE_SIZE));
  const t = await getTranslations("outfits.page");

  return (
    <main>
      <PageHeader
        title={active.isSelf ? t("title") : t("titleFor", { name: active.person.display_name })}
        subtitle={t("subtitle", { count: combos.length })}
      />

      <div className="space-y-6 px-6 pb-10 md:px-10">
        <Suspense>
          <FilterBar
            tops={tops}
            bottoms={bottoms}
            shoes={shoes}
            outerwear={outerwear}
            watches={watches}
            accessories={accessories}
          />
        </Suspense>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
            <Layers className="size-8 text-muted-foreground" aria-hidden />
            {filtered ? (
              <>
                <h2 className="mt-4 font-serif text-2xl">{t("noMatchTitle")}</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {t("noMatchBody")}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-serif text-2xl">{t("emptyTitle")}</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {t("emptyBody")}
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/wardrobe">{t("goToWardrobe")}</Link>
                </Button>
              </>
            )}
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

        {combos.length > shown && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t("showing", { shown, total: combos.length })}
            </p>
            <Button asChild variant="outline">
              <Link href={`/combinations?${moreParams.toString()}`} scroll={false}>
                {t("showMore")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
