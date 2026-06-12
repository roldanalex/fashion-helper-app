import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export interface Access {
  user: User | null;
  approved: boolean;
  isAdmin: boolean;
}

/**
 * Approval status for the current session, checked under the user's own
 * RLS-scoped client ("Users read own grant" policy).
 */
export async function getAccess(supabase: SupabaseClient): Promise<Access> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { user: null, approved: false, isAdmin: false };

  const { data: grant } = await supabase
    .from("access_grants")
    .select("role")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  return {
    user,
    approved: !!grant,
    isAdmin: grant?.role === "admin",
  };
}

/**
 * API-route guard. Returns the user when approved, or a ready-to-return
 * 401/403 response otherwise. Call before any OpenAI/weather work.
 */
export async function requireApproved(
  supabase: SupabaseClient,
): Promise<{ user: User; deny: null } | { user: null; deny: NextResponse }> {
  const { user, approved } = await getAccess(supabase);
  if (!user) {
    return {
      user: null,
      deny: NextResponse.json(
        { error: { code: "unauthorized", message: "Not signed in" } },
        { status: 401 },
      ),
    };
  }
  if (!approved) {
    return {
      user: null,
      deny: NextResponse.json(
        {
          error: {
            code: "not_approved",
            message: "This account hasn't been granted access yet.",
          },
        },
        { status: 403 },
      ),
    };
  }
  return { user, deny: null };
}
