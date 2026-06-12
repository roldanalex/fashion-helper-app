import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { user, approved } = await getAccess(supabase);
  if (!user) redirect("/");
  if (!approved) redirect("/pending");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();
  if (profile?.onboarded_at) redirect("/today");

  return (
    <main className="flex min-h-dvh items-center">
      <OnboardingWizard />
    </main>
  );
}
