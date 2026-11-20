import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { personSession } from "@/lib/people/session";
import type { ManagedPersonView } from "@/components/people/people-manager";
import { loadFamilies } from "@/lib/families/overview";
import type { Profile } from "@/types/database";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("meta.title") };
}

export default async function SettingsPage() {
  const session = await personSession();
  if (!session) redirect("/");
  const { user, accountProfile, people } = session;
  if (!accountProfile) redirect("/onboarding");
  const t = await getTranslations("settings");

  const { families, invites } = await loadFamilies(session.supabase);
  const managed: ManagedPersonView[] = await Promise.all(
    people
      .filter((p) => p.kind === "managed")
      .map(async (person) => ({
        person,
        pieceCount: (await session.wardrobeFor(person.id)!.pieces()).length,
      })),
  );

  return (
    <main>
      <PageHeader title={t("page.title")} subtitle={t("page.subtitle")} />
      <div className="px-6 pb-10 md:px-10">
        <SettingsClient
          profile={accountProfile as Profile}
          email={user.email ?? t("page.yourAccount")}
          managedPeople={managed}
          families={families}
          invites={invites}
          familyChoices={families
            .filter((f) => f.myRole !== "viewer")
            .map((f) => ({ id: f.id, name: f.myRole === "owner" ? t("page.yourFamily") : f.name }))}
        />
      </div>
    </main>
  );
}
