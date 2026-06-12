import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ClothingItem } from "@/types/database";

const statusLabel: Record<string, { text: string; tone: string } | null> = {
  pending: { text: "Analyzing…", tone: "bg-secondary text-secondary-foreground" },
  tagged: { text: "Review tags", tone: "bg-primary/15 text-primary" },
  failed: { text: "Needs retry", tone: "bg-destructive/15 text-destructive" },
  confirmed: null,
};

export function ItemCard({
  item,
  imageUrl,
}: {
  item: ClothingItem;
  imageUrl?: string;
}) {
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
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {status && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.tone}`}
          >
            {status.text}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant="secondary" className="capitalize">
            {item.subcategory ?? item.category}
          </Badge>
          {item.material && (
            <span className="text-xs capitalize text-muted-foreground">
              {item.material}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
