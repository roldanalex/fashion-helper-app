import { PageHeader } from "@/components/shared/page-header";
import { StylistChat } from "@/components/stylist/stylist-chat";
import { createClient } from "@/lib/supabase/server";
import { getWardrobeReadiness } from "@/lib/combinations/readiness";

export const metadata = { title: "Stylist" };

export default async function StylistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Stylist"
        subtitle="Pack for a trip in one conversation, or ask what goes with what."
      />
      <StylistChat
        userId={user?.id ?? "anonymous"}
        hasCombinations={(count ?? 0) > 0}
        readiness={getWardrobeReadiness(items ?? [])}
      />
    </main>
  );
}
