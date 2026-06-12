import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/onboarding");

  return (
    <main>
      <PageHeader title="Settings" subtitle="Profile, preferences and account." />
      <div className="px-6 pb-10 md:px-10">
        <SettingsClient
          profile={profile as Profile}
          email={user.email ?? "your account"}
        />
      </div>
    </main>
  );
}
