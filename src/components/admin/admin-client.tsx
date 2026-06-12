"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, ShieldCheck, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { grantAccess, revokeAccess } from "@/app/(app)/admin/actions";
import type { AccessGrant } from "@/types/database";

export interface PendingUser {
  email: string;
  created_at: string;
}

export function AdminClient({
  grants,
  pending,
  ownEmail,
}: {
  grants: AccessGrant[];
  pending: PendingUser[];
  ownEmail: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [newEmail, setNewEmail] = useState("");

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>, okMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else toast.success(okMsg);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-10">
      {pending.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl">Waiting for access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These people signed in with Google but can&apos;t use the app yet.
          </p>
          <div className="mt-4 divide-y rounded-xl border bg-card">
            {pending.map((p) => (
              <div
                key={p.email}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{p.email}</p>
                  <p className="text-xs text-muted-foreground">
                    signed in {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={() => run(() => grantAccess(p.email), `Approved ${p.email}`)}
                >
                  <Check className="size-3.5" aria-hidden /> Approve
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-serif text-2xl">Invite by email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-approve someone — they&apos;ll get straight in the first time they
          sign in with Google.
        </p>
        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">
              Email to invite
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="friend@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button
            className="gap-1.5"
            disabled={busy || !newEmail.trim()}
            onClick={() =>
              run(() => grantAccess(newEmail), `Invited ${newEmail.trim().toLowerCase()}`)
            }
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="size-4" aria-hidden />
            )}
            Grant access
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Who has access</h2>
        <div className="mt-4 divide-y rounded-xl border bg-card">
          {grants.map((g) => (
            <div
              key={g.email}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{g.email}</p>
                {g.role === "admin" && (
                  <Badge className="gap-1 bg-primary/15 text-primary">
                    <ShieldCheck className="size-3" aria-hidden /> Admin
                  </Badge>
                )}
              </div>
              {g.email !== ownEmail ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  disabled={busy}
                  onClick={() => run(() => revokeAccess(g.email), `Revoked ${g.email}`)}
                >
                  <X className="size-3.5" aria-hidden /> Revoke
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">you</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          You can also manage this list in Supabase → Table Editor →
          access_grants.
        </p>
      </section>
    </div>
  );
}
