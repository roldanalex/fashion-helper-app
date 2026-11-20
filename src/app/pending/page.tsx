import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("awaitingInvitation") };
}

export default async function PendingPage() {
  const supabase = await createClient();
  const { user, approved } = await getAccess(supabase);

  if (!user) redirect("/");
  if (approved) redirect("/today");
  const t = await getTranslations("nav");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Hourglass className="size-8 text-primary" aria-hidden />
      <h1 className="mt-6 text-4xl">{t("pending.title")}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t.rich("pending.body", {
          email: user.email ?? "",
          b: (chunks) => <span className="text-foreground">{chunks}</span>,
        })}
      </p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
