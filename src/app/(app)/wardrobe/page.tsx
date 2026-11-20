import { Shirt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import { UploadSheet } from "@/components/wardrobe/upload-sheet";
import { ReadinessBanner } from "@/components/wardrobe/readiness-banner";
import { getWardrobeReadiness } from "@/lib/combinations/readiness";
import { personSession } from "@/lib/people/session";
import { signImageUrls } from "@/lib/supabase/storage";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("wardrobe");
  return { title: t("meta.title") };
}

export default async function WardrobePage() {
  const session = await personSession();
  if (!session) redirect("/");
  const { supabase, wardrobe, active } = session;
  const items = await wardrobe.pieces();
  const urls = await signImageUrls(
    supabase,
    items.map((i) => i.image_url),
  );

  const readiness = getWardrobeReadiness(items);
  const t = await getTranslations("wardrobe");

  return (
    <main>
      <PageHeader
        title={active.isSelf ? t("page.title") : t("page.titleFor", { name: active.person.display_name })}
        subtitle={
          items.length > 0
            ? t("page.catalogued", { count: items.length })
            : t("page.subtitleEmpty")
        }
      >
        <UploadSheet
          person={{
            id: active.person.id,
            name: active.person.display_name,
            isMinor: active.isMinor,
            isSelf: active.isSelf,
          }}
        />
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
            <h2 className="mt-4 font-serif text-2xl">{t("page.emptyTitle")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t("page.emptyBody")}
            </p>
          </div>
        ) : (
          <WardrobeGrid items={items} imageUrls={urls} />
        )}
      </div>
    </main>
  );
}
