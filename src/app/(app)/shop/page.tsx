import { PageHeader } from "@/components/shared/page-header";
import { ShopClient } from "@/components/shop/shop-client";
import { analyzeGaps } from "@/lib/gap-analysis";
import { createClient } from "@/lib/supabase/server";
import type { ClothingItem, ShoppingSuggestion } from "@/types/database";

export const metadata = { title: "Shop" };

export default async function ShopPage() {
  const supabase = await createClient();

  const [{ data: wardrobeData }, { data: profile }, { data: suggestionData }] =
    await Promise.all([
      supabase
        .from("clothing_items")
        .select("*")
        .eq("archived", false)
        .eq("ai_status", "confirmed"),
      supabase.from("profiles").select("preferred_formality").single(),
      supabase
        .from("shopping_suggestions")
        .select("*")
        .in("status", ["suggested", "saved"])
        .order("created_at", { ascending: false }),
    ]);

  const wardrobe = (wardrobeData ?? []) as ClothingItem[];
  const gaps = analyzeGaps(wardrobe, profile?.preferred_formality ?? null);

  return (
    <main>
      <PageHeader
        title="Shop"
        subtitle="Grow your wardrobe with intention — every purchase scored by the outfits it unlocks."
      />
      <div className="px-6 pb-10 md:px-10">
        <ShopClient
          gaps={gaps}
          suggestions={(suggestionData ?? []) as ShoppingSuggestion[]}
        />
      </div>
    </main>
  );
}
