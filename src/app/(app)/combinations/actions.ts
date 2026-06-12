"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function setFlag(
  combinationId: string,
  flag: "boosted" | "hidden",
  value: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("combinations")
    .update({ [flag]: value })
    .eq("id", combinationId)
    .eq("user_id", user.id);
  if (error) return { error: "Could not update. Please try again." };

  revalidatePath("/combinations");
  return { ok: true };
}

export async function toggleBoost(combinationId: string, value: boolean) {
  return setFlag(combinationId, "boosted", value);
}

export async function toggleHide(combinationId: string, value: boolean) {
  return setFlag(combinationId, "hidden", value);
}
