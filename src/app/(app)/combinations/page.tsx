import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Outfits" };

export default function CombinationsPage() {
  return (
    <main>
      <PageHeader
        title="Outfits"
        subtitle="Your combination table — every pairing worth wearing."
      />
      <div className="px-6 md:px-10">
        <p className="text-sm text-muted-foreground">
          The combinations browser arrives in milestone M6.
        </p>
      </div>
    </main>
  );
}
