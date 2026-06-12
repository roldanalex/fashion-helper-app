"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

const emailSchema = z.string().email("That doesn't look like an email");

export async function grantAccess(email: string) {
  const supabase = await createClient();
  const { user, isAdmin } = await getAccess(supabase);
  if (!user || !isAdmin) return { error: "Admins only" };

  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // RLS ("Admins manage grants") is the backstop for this insert.
  const { error } = await supabase.from("access_grants").insert({
    email: parsed.data,
    granted_by: user.email,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Already has access" : "Could not grant access",
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function revokeAccess(email: string) {
  const supabase = await createClient();
  const { user, isAdmin } = await getAccess(supabase);
  if (!user || !isAdmin) return { error: "Admins only" };

  const target = email.trim().toLowerCase();
  if (target === user.email?.toLowerCase()) {
    return { error: "You can't revoke your own access" };
  }

  const { error } = await supabase
    .from("access_grants")
    .delete()
    .eq("email", target);
  if (error) return { error: "Could not revoke access" };

  revalidatePath("/admin");
  return { ok: true };
}
