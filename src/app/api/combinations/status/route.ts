import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";

export async function GET() {
  const supabase = await createClient();
  const { deny } = await requireApproved(supabase);
  if (deny) return deny;

  const [{ data: items }, { count }] = await Promise.all([
    supabase
      .from("clothing_items")
      .select("id, name, combo_status")
      .eq("archived", false)
      .in("combo_status", ["queued", "generating", "done", "failed"]),
    supabase
      .from("combinations")
      .select("*", { count: "exact", head: true })
      .eq("hidden", false),
  ]);

  return NextResponse.json({
    items: items ?? [],
    totalCombinations: count ?? 0,
    generating: (items ?? []).some(
      (i) => i.combo_status === "queued" || i.combo_status === "generating",
    ),
  });
}
