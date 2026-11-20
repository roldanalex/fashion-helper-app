import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { FamilyClient } from "@/components/family/family-client";
import { personSession } from "@/lib/people/session";

export async function generateMetadata() {
  const t = await getTranslations("family");
  return { title: t("meta.title") };
}

export default async function FamilyPage() {
  const session = await personSession();
  if (!session) redirect("/");
  const t = await getTranslations("family");

  const people = await Promise.all(
    session.viewablePeople.map(async (p) => ({
      id: p.id,
      name: p.display_name,
      isSelf: p.kind === "self" && p.account_user_id === session.user.id,
      isMinor: p.age_band !== "adult",
      outfitCount: await session.viewWardrobeFor(p.id)!.outfitCount(),
    })),
  );

  return (
    <main>
      <PageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
      />
      <div className="px-6 pb-10 md:px-10">
        <FamilyClient people={people} />
      </div>
    </main>
  );
}
