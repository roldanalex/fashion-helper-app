import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminClient, type PendingUser } from "@/components/admin/admin-client";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import type { AccessGrant } from "@/types/database";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { user, isAdmin } = await getAccess(supabase);
  if (!user || !isAdmin) redirect("/today");

  const [{ data: grantData }, { data: profileData }] = await Promise.all([
    supabase.from("access_grants").select("*").order("created_at"),
    supabase
      .from("profiles")
      .select("email, created_at")
      .not("email", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const grants = (grantData ?? []) as AccessGrant[];
  const granted = new Set(grants.map((g) => g.email));
  const pending: PendingUser[] = (profileData ?? [])
    .filter((p) => p.email && !granted.has(p.email))
    .map((p) => ({ email: p.email as string, created_at: p.created_at }));

  return (
    <main>
      <PageHeader
        title="Admin"
        subtitle="Decide who may use the app — and your API credits."
      />
      <div className="px-6 pb-10 md:px-10">
        <AdminClient
          grants={grants}
          pending={pending}
          ownEmail={user.email?.toLowerCase() ?? ""}
        />
      </div>
    </main>
  );
}
