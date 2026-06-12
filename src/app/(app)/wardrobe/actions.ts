"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { itemTagsSchema } from "@/lib/schemas";

export async function confirmItemTags(itemId: string, tags: unknown) {
  const parsed = itemTagsSchema.safeParse(tags);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid tags" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("clothing_items")
    .update({ ...parsed.data, ai_status: "confirmed", combo_status: "queued" })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { error: "Could not save. Please try again." };

  revalidatePath("/wardrobe");
  return { ok: true };
}

export async function archiveItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("clothing_items")
    .update({ archived: true })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { error: "Could not archive. Please try again." };

  revalidatePath("/wardrobe");
  return { ok: true };
}
