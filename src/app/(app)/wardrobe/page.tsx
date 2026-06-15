import { Shirt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ItemCard } from "@/components/wardrobe/item-card";
import { UploadSheet } from "@/components/wardrobe/upload-sheet";
import { ReadinessBanner } from "@/components/wardrobe/readiness-banner";
import { getWardrobeReadiness } from "@/lib/combinations/readiness";
import { createClient } from "@/lib/supabase/server";
import { signImageUrls } from "@/lib/supabase/storage";
import type { ClothingItem } from "@/types/database";

export const metadata = { title: "Wardrobe" };

export default async function WardrobePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as ClothingItem[];
  const urls = await signImageUrls(
    supabase,
    items.map((i) => i.image_url),
  );

  const readiness = getWardrobeReadiness(items);

  return (
    <main>
      <PageHeader
        title="Wardrobe"
        subtitle={
          items.length > 0
            ? `${items.length} ${items.length === 1 ? "piece" : "pieces"} catalogued`
            : "Every piece you own, beautifully catalogued."
        }
      >
        <UploadSheet />
      </PageHeader>

      <div className="px-6 pb-10 md:px-10">
        {items.length > 0 && (
          <div className="mb-6">
            <ReadinessBanner readiness={readiness} />
          </div>
        )}
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
            <Shirt className="size-8 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 font-serif text-2xl">An empty closet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Photograph your first piece and the stylist will start building
              your combination table. Six to eight pieces unlock real outfits.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} imageUrl={urls[item.image_url]} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
