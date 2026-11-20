import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { StylistChat } from "@/components/stylist/stylist-chat";
import { personSession } from "@/lib/people/session";

export async function generateMetadata() {
  const t = await getTranslations("stylist");
  return { title: t("meta.title") };
}

export default async function StylistPage() {
  const t = await getTranslations("stylist");
  const session = await personSession();
  if (!session) redirect("/");
  const { wardrobe, active, user } = session;
  const [count, readiness] = await Promise.all([wardrobe.outfitCount(), wardrobe.readiness()]);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={active.isSelf ? t("meta.title") : t("header.titleFor", { name: active.person.display_name })}
        subtitle={t("header.subtitle")}
      />
      <StylistChat
        key={active.person.id}
        userId={user.id}
        personId={active.person.id}
        alias={
          active.isMinor
            ? { alias: active.subject.alias, name: active.person.display_name }
            : undefined
        }
        hasCombinations={count > 0}
        readiness={readiness}
      />
    </main>
  );
}
