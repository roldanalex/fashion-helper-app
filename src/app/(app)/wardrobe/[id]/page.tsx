import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TagEditor } from "@/components/wardrobe/tag-editor";
import { createClient } from "@/lib/supabase/server";
import { signImageUrls } from "@/lib/supabase/storage";
import type { ClothingItem } from "@/types/database";

export const metadata = { title: "Piece" };

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const item = data as ClothingItem;
  const urls = await signImageUrls(supabase, [item.image_url]);

  return (
    <main className="px-6 py-8 md:px-10">
      <Link
        href="/wardrobe"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Wardrobe
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
