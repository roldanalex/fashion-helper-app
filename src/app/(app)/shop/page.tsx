import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <main>
      <PageHeader
        title="Shop"
        subtitle="What to buy next to unlock the most new outfits."
      />
      <div className="px-6 md:px-10">
        <p className="text-sm text-muted-foreground">
          Gap analysis arrives in milestone M7.
        </p>
      </div>
    </main>
  );
}
