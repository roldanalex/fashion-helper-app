import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { TodayClient } from "@/components/today/today-client";
import { personSession } from "@/lib/people/session";

export async function generateMetadata() {
  const t = await getTranslations("today");
  return { title: t("meta.title") };
}

export default async function TodayPage() {
  const t = await getTranslations("today");
  const session = await personSession();
  if (!session) redirect("/");
  const { wardrobe, active, people } = session;
  const [count, readiness] = await Promise.all([wardrobe.outfitCount(), wardrobe.readiness()]);

  return (
    <main>
      <PageHeader
        title={active.isSelf ? t("meta.title") : t("header.titleFor", { name: active.person.display_name })}
        subtitle={t("header.subtitle")}
      />
      <div className="px-6 pb-10 md:px-10">
        <TodayClient
          key={active.person.id}
          personId={active.person.id}
          isMinor={active.isMinor}
          familySize={people.length}
          hasCombinations={count > 0}
          readiness={readiness}
        />
      </div>
    </main>
  );
}
