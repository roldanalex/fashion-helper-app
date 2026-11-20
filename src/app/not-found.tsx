import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("nav");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl">{t("notFound.title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("notFound.body")}
      </p>
      <Button asChild className="mt-6">
        <Link href="/today">{t("notFound.goToToday")}</Link>
      </Button>
    </main>
  );
}
