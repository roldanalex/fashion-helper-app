import { redirect } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
import { UnitsProvider } from "@/components/shared/units-provider";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

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
    .select("onboarded_at, units")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <UnitsProvider initial={profile.units === "imperial" ? "imperial" : "metric"}>
      <AppShell isAdmin={isAdmin}>{children}</AppShell>
    </UnitsProvider>
  );
}
