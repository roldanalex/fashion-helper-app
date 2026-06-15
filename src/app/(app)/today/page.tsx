import { PageHeader } from "@/components/shared/page-header";
import { TodayClient } from "@/components/today/today-client";
import { createClient } from "@/lib/supabase/server";
import { getWardrobeReadiness } from "@/lib/combinations/readiness";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const supabase = await createClient();
  const [{ count }, { data: items }] = await Promise.all([
    supabase
      .from("combinations")
      .select("*", { count: "exact", head: true })
      .eq("hidden", false),
    supabase
      .from("clothing_items")
      .select("category, ai_status, archived, combo_status")
      .eq("archived", false)
      .eq("ai_status", "confirmed"),
  ]);

  const readiness = getWardrobeReadiness(items ?? []);

  return (
    <main>
      <PageHeader
        title="Today"
        subtitle="Tell me your plans — I'll lay out the outfit."
      />
      <div className="px-6 pb-10 md:px-10">
        <TodayClient
          hasCombinations={(count ?? 0) > 0}
          readiness={readiness}
        />
      </div>
    </main>
  );
}
