import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/shared/app-shell";
import { UnitsProvider } from "@/components/shared/units-provider";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { measuresFrom } from "@/lib/units";
import { personSessionFor } from "@/lib/people/session";
import type { PersonOption } from "@/components/people/person-switcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { user, approved, isAdmin } = await getAccess(supabase);

  if (!user) redirect("/");
  if (!approved) redirect("/pending");

  const { data: profile } = await supabase
    .from("profiles")
    // "*" so the app keeps working before migration 0013 adds the unit and language columns.
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  let people: PersonOption[] = [];
  let activeId = "";
  let setupNeeded = false;
  try {
    const session = await personSessionFor(supabase, user);
    people = session.people.map((p) => ({
      id: p.id,
      name: p.display_name,
      isSelf: p.kind === "self",
      isMinor: p.age_band !== "adult",
    }));
    activeId = session.active.person.id;
  } catch {
    // People and Families (migration 0011) are missing: say so instead of failing every page.
    setupNeeded = true;
  }

  const t = await getTranslations("nav");

  return (
    <UnitsProvider
      initial={profile.units === "imperial" ? "imperial" : "metric"}
      initialMeasures={measuresFrom(profile)}
    >
      <AppShell isAdmin={isAdmin} people={people} activeId={activeId}>
        {setupNeeded ? (
          <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
            <h1 className="text-3xl">{t("setupNeeded.title")}</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t.rich("setupNeeded.body", { code: (chunks) => <code>{chunks}</code> })}
            </p>
          </main>
        ) : (
          children
        )}
      </AppShell>
    </UnitsProvider>
  );
}
