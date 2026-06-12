import { redirect } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
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
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
