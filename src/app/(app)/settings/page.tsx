import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main>
      <PageHeader title="Settings" subtitle="Profile, preferences and account." />
      <div className="px-6 md:px-10">
        <p className="text-sm text-muted-foreground">
          Settings arrive in milestone M8.
        </p>
      </div>
    </main>
  );
}
