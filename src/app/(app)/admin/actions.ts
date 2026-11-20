"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

const emailSchema = z.string().email();

export async function grantAccess(email: string) {
  const t = await getTranslations("admin.errors");
  const supabase = await createClient();
  const { user, isAdmin } = await getAccess(supabase);
  if (!user || !isAdmin) return { error: t("adminsOnly") };

  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { error: t("invalidEmail") };

  // RLS ("Admins manage grants") is the backstop for this insert.
  const { error } = await supabase.from("access_grants").insert({
    email: parsed.data,
    granted_by: user.email,
  });
  if (error) {
    return {
      error: error.code === "23505" ? t("alreadyHasAccess") : t("couldNotGrant"),
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function revokeAccess(email: string) {
  const t = await getTranslations("admin.errors");
  const supabase = await createClient();
  const { user, isAdmin } = await getAccess(supabase);
  if (!user || !isAdmin) return { error: t("adminsOnly") };

  const target = email.trim().toLowerCase();
  if (target === user.email?.toLowerCase()) {
    return { error: t("cannotRevokeSelf") };
  }

  const { error } = await supabase
    .from("access_grants")
    .delete()
    .eq("email", target);
  if (error) return { error: t("couldNotRevoke") };

  revalidatePath("/admin");
  return { ok: true };
}
