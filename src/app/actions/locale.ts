"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/**
 * Change the language. Works signed out (landing page) through the cookie;
 * signed in, it is also saved on the profile so the AI answers in it.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return { error: "Unsupported language" };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
    if (error) console.error("setLocale: profile not updated (has migration 0013 been run?):", error.message);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
