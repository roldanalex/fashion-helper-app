import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TagEditor } from "@/components/wardrobe/tag-editor";
import { personSession } from "@/lib/people/session";
import { signImageUrls } from "@/lib/supabase/storage";
import type { ClothingItem } from "@/types/database";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("wardrobe");
  return { title: t("meta.pieceTitle") };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await personSession();
  if (!session) notFound();
  // The piece may belong to any Person this Account dresses, not only the active one.
  let item: ClothingItem | null = null;
  for (const p of session.people) {
    item = await session.wardrobeFor(p.id)!.piece(id);
    if (item) break;
  }
  if (!item) notFound();
  const { supabase } = session;
  const urls = await signImageUrls(supabase, [item.image_url]);
  const t = await getTranslations("wardrobe");

  return (
    <main className="px-6 py-6 md:px-10 md:py-8">
      <Link
        href="/wardrobe"
        className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t("item.back")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-secondary">
            {urls[item.image_url] && (
              <Image
                src={urls[item.image_url]}
                alt={item.name}
                fill
                sizes="(max-width: 1024px) 100vw, 320px"
                className="object-cover"
                priority
              />
            )}
          </div>
          {item.description && (
            <p className="mt-3 text-sm italic text-muted-foreground">
              “{item.description}”
            </p>
          )}
        </div>

        <div>
          <h1 className="mb-6 text-3xl">{item.name}</h1>
          <TagEditor item={item} />
        </div>
      </div>
    </main>
  );
}
