import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FamilyMemberView {
  id: string;
  name: string;
  role: "owner" | "manager" | "viewer";
  shares: boolean;
  isMe: boolean;
}

export interface FamilyView {
  id: string;
  name: string;
  myRole: "owner" | "manager" | "viewer";
  members: FamilyMemberView[];
  /** Invites this family has sent and nobody has answered yet (managers only). */
  pendingInvites: { id: string; email: string; role: "manager" | "viewer" }[];
}

export interface InviteForMe {
  id: string;
  familyName: string;
  ownerName: string;
  role: "manager" | "viewer";
}

/** The caller's Families with members, outgoing invites, and invites addressed to them. */
export async function loadFamilies(
  supabase: SupabaseClient,
): Promise<{ families: FamilyView[]; invites: InviteForMe[] }> {
  const [{ data: rows, error }, { data: inviteRows }] = await Promise.all([
    supabase.rpc("my_families"),
    supabase.rpc("my_family_invites"),
  ]);
  if (error) {
    console.error("my_families failed (has migration 0013 been run?):", error.message);
    return { families: [], invites: [] };
  }

  const byId = new Map<string, FamilyView>();
  for (const r of (rows ?? []) as {
    family_id: string;
    family_name: string;
    my_role: FamilyView["myRole"];
    member_id: string;
    member_name: string;
    member_role: FamilyMemberView["role"];
    member_shares: boolean;
    is_me: boolean;
  }[]) {
    const f =
      byId.get(r.family_id) ??
      ({ id: r.family_id, name: r.family_name, myRole: r.my_role, members: [], pendingInvites: [] } as FamilyView);
    f.members.push({ id: r.member_id, name: r.member_name, role: r.member_role, shares: r.member_shares, isMe: r.is_me });
    byId.set(r.family_id, f);
  }

  const managed = [...byId.values()].filter((f) => f.myRole !== "viewer").map((f) => f.id);
  if (managed.length) {
    const { data: sent } = await supabase
      .from("family_invites")
      .select("id, family_id, email, role")
      .in("family_id", managed);
    for (const i of (sent ?? []) as { id: string; family_id: string; email: string; role: "manager" | "viewer" }[]) {
      byId.get(i.family_id)?.pendingInvites.push({ id: i.id, email: i.email, role: i.role });
    }
  }

  return {
    families: [...byId.values()],
    invites: ((inviteRows ?? []) as {
      invite_id: string;
      family_name: string;
      owner_name: string;
      role: "manager" | "viewer";
    }[]).map((i) => ({ id: i.invite_id, familyName: i.family_name, ownerName: i.owner_name, role: i.role })),
  };
}
