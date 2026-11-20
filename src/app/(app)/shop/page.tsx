import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ShopClient } from "@/components/shop/shop-client";
import { analyzeGaps } from "@/lib/gap-analysis";
import { personSession } from "@/lib/people/session";

export async function generateMetadata() {
  const t = await getTranslations("shop");
  return { title: t("meta.title") };
}

export default async function ShopPage() {
  const t = await getTranslations("shop");
  const session = await personSession();
  if (!session) redirect("/");
  const { wardrobe, active } = session;

  const [pieces, suggestions] = await Promise.all([
    wardrobe.pieces({ confirmed: true }),
    wardrobe.suggestions(["suggested", "saved", "dismissed"]),
  ]);
  const gaps = analyzeGaps(pieces, active.formality);

  return (
    <main>
      <PageHeader
        title={active.isSelf ? t("meta.title") : t("header.titleFor", { name: active.person.display_name })}
        subtitle={t("header.subtitle")}
      />
      <div className="px-6 pb-10 md:px-10">
        <ShopClient
          key={active.person.id}
          personId={active.person.id}
          gaps={gaps}
          wardrobeCount={pieces.length}
          suggestions={suggestions}
        />
      </div>
    </main>
  );
}
