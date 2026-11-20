import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";
import type { ClothingItem } from "@/types/database";

/** `text` is a key under wardrobe.status. */
const statusLabel: Record<string, { text: "pending" | "tagged" | "failed"; tone: string } | null> = {
  pending: { text: "pending", tone: "bg-secondary text-secondary-foreground" },
  tagged: { text: "tagged", tone: "bg-primary/15 text-primary" },
  failed: { text: "failed", tone: "bg-destructive/20 text-[oklch(0.78_0.11_25)]" },
  confirmed: null,
};

export function ItemCard({
  item,
  imageUrl,
}: {
  item: ClothingItem;
  imageUrl?: string;
}) {
  const t = useTranslations("wardrobe");
  const tx = useTaxonomy();
  const status = statusLabel[item.ai_status];

  return (
    <Link
      href={`/wardrobe/${item.id}`}
      className="group overflow-hidden rounded-lg border bg-card transition-colors duration-200 hover:border-primary/40"
    >
      <div className="relative aspect-square bg-secondary">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {status && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}
          >
            {t(`status.${status.text}`)}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant="secondary" className="capitalize">
            {item.subcategory ? tx("subcategory", item.subcategory) : tx("category", item.category)}
          </Badge>
          {item.material && (
            <span className="text-xs capitalize text-muted-foreground">
              {tx("material", item.material)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
