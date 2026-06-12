import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

export const metadata = { title: "Awaiting invitation" };

export default async function PendingPage() {
  const supabase = await createClient();
  const { user, approved } = await getAccess(supabase);

  if (!user) redirect("/");
  if (approved) redirect("/today");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Hourglass className="size-8 text-primary" aria-hidden />
      <h1 className="mt-6 text-4xl">Awaiting your invitation</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        You&apos;re signed in as <span className="text-foreground">{user.email}</span>,
        but this account hasn&apos;t been granted access yet. Aether Wardrobe is
        invitation-only — ask the owner to approve your email, then refresh
        this page.
      </p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
