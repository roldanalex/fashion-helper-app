import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <main>
      <PageHeader
        title="Today"
        subtitle="Tell me your plans — I'll lay out the outfit."
      />
      <div className="px-6 md:px-10">
        <p className="text-sm text-muted-foreground">
          Daily recommendations arrive in milestone M5.
        </p>
      </div>
    </main>
  );
}
