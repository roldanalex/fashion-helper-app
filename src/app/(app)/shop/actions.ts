"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSuggestionStatus(
  suggestionId: string,
  status: "saved" | "dismissed" | "purchased",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("shopping_suggestions")
    .update({ status })
    .eq("id", suggestionId)
    .eq("user_id", user.id);
  if (error) return { error: "Could not update. Please try again." };

  revalidatePath("/shop");
  return { ok: true };
}
