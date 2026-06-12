import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Wardrobe" };

export default function WardrobePage() {
  return (
    <main>
      <PageHeader
        title="Wardrobe"
        subtitle="Every piece you own, beautifully catalogued."
      />
      <div className="px-6 md:px-10">
        <p className="text-sm text-muted-foreground">
          Wardrobe upload arrives in milestone M3.
        </p>
      </div>
    </main>
  );
}
