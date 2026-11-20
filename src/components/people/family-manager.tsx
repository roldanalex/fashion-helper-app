"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, Loader2, LogOut, Mail, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { PersonInitial } from "@/components/people/person-switcher";
import {
  acceptFamilyInvite,
  deleteFamilyInvite,
  inviteToFamily,
  leaveFamily,
  removeFamilyMember,
  setShareSelf,
} from "@/app/(app)/family/actions";
import type { FamilyView, InviteForMe } from "@/lib/families/overview";

type Confirm =
  | { kind: "leave"; family: FamilyView }
  | { kind: "remove"; family: FamilyView; memberId: string; name: string };

export function FamilyManager({ families, invites }: { families: FamilyView[]; invites: InviteForMe[] }) {
  const t = useTranslations("people.family");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState<Record<string, string>>({});
  const [role, setRole] = useState<Record<string, "manager" | "viewer">>({});
  const [shareOnAccept, setShareOnAccept] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {invites.length > 0 && (
        <ul className="space-y-3" aria-label={t("invitationsForYou")}>
          {invites.map((inv) => (
            <li key={inv.id} className="rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-sm">
                {t.rich("invitedYou", {
                  owner: inv.ownerName,
                  family: inv.familyName,
                  role: t(`rolesLower.${inv.role}`),
                  b: (chunks) => <span className="font-medium">{chunks}</span>,
                })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`roleHelp.${inv.role}`)}</p>
              <div className="mt-3 flex items-center gap-3">
                <Switch
                  id={`share-${inv.id}`}
                  checked={shareOnAccept[inv.id] ?? false}
                  onCheckedChange={(v) => setShareOnAccept((s) => ({ ...s, [inv.id]: v }))}
                />
                <Label htmlFor={`share-${inv.id}`} className="text-sm font-normal">
                  {t("shareOnJoin")}
                </Label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  disabled={pending}
                  onClick={() =>
                    run(() => acceptFamilyInvite(inv.id, shareOnAccept[inv.id] ?? false), t("joined", { family: inv.familyName }))
                  }
                >
                  <Check aria-hidden /> {t("join")}
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  disabled={pending}
                  onClick={() => run(() => deleteFamilyInvite(inv.id), t("declined"))}
                >
                  <X aria-hidden /> {t("decline")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {families.map((f) => {
        const me = f.members.find((m) => m.isMe);
        const canInvite = f.myRole !== "viewer";
        return (
          <section key={f.id} aria-labelledby={`family-${f.id}`} className="rounded-xl border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <h3 id={`family-${f.id}`} className="font-serif text-xl">
                {f.myRole === "owner" ? t("yourFamily") : f.name}
              </h3>
              <span className="text-sm text-muted-foreground">{t("youAre", { role: t(`rolesLower.${f.myRole}`) })}</span>
            </header>

            <ul className="divide-y" aria-label={t("members")}>
              {f.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <PersonInitial name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {m.name}
                      {m.isMe && <span className="text-sm text-muted-foreground"> {t("you")}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`roles.${m.role}`)} · {m.shares ? t("sharesWardrobe") : t("keepsPrivate")}
                    </p>
                  </div>
                  {f.myRole === "owner" && !m.isMe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => setConfirm({ kind: "remove", family: f, memberId: m.id, name: m.name })}
                    >
                      <UserMinus aria-hidden /> {t("remove")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            <div className="space-y-4 border-t px-4 py-4">
              {me && (
                <div className="flex items-center gap-3">
                  <Switch
                    id={`share-self-${f.id}`}
                    checked={me.shares}
                    disabled={pending}
                    onCheckedChange={(v) =>
                      run(
                        () => setShareSelf(f.id, v),
                        v ? t("nowShared") : t("nowPrivate"),
                      )
                    }
                  />
                  <Label htmlFor={`share-self-${f.id}`} className="text-sm font-normal">
                    {t("shareSelf")}
                  </Label>
                </div>
              )}

              {canInvite && (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const to = (email[f.id] ?? "").trim();
                    if (!to) return;
                    run(
                      () => inviteToFamily(f.id, to, role[f.id] ?? "manager"),
                      t("invitationSent", { email: to }),
                    );
                    setEmail((s) => ({ ...s, [f.id]: "" }));
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor={`invite-${f.id}`}>{t("inviteLabel")}</Label>
                    <Input
                      id={`invite-${f.id}`}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      placeholder="partner@example.com"
                      value={email[f.id] ?? ""}
                      onChange={(e) => setEmail((s) => ({ ...s, [f.id]: e.target.value }))}
                    />
                  </div>
                  <ChipGroup
                    label={t("whatCanTheyDo")}
                    hint={t(`roleHelp.${role[f.id] ?? "manager"}`)}
                    options={[
                      { value: "manager", label: t("manage") },
                      { value: "viewer", label: t("viewOnly") },
                    ]}
                    value={role[f.id] ?? "manager"}
                    onChange={(v) => setRole((s) => ({ ...s, [f.id]: v as "manager" | "viewer" }))}
                  />
                  <Button type="submit" variant="outline" className="gap-2" disabled={pending || !(email[f.id] ?? "").trim()}>
                    {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail aria-hidden />}
                    {t("sendInvitation")}
                  </Button>
                </form>
              )}

              {f.pendingInvites.length > 0 && (
                <div>
                  <p className="text-sm font-medium">{t("waiting")}</p>
                  <ul className="mt-2 space-y-1">
                    {f.pendingInvites.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span className="min-w-0 truncate">
                          {i.email} · {t(`rolesLower.${i.role}`)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => deleteFamilyInvite(i.id), t("withdrawn"))}
                        >
                          {t("withdraw")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {f.myRole !== "owner" && (
                <Button
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  onClick={() => setConfirm({ kind: "leave", family: f })}
                >
                  <LogOut aria-hidden /> {t("leaveThisFamily")}
                </Button>
              )}
            </div>
          </section>
        );
      })}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === "leave"
                ? t("leaveTitle", { family: confirm.family.name })
                : t("removeTitle", { name: confirm?.kind === "remove" ? confirm.name : "" })}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "leave"
                ? t("leaveDescription")
                : t("removeDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const c = confirm;
                setConfirm(null);
                if (!c) return;
                if (c.kind === "leave") run(() => leaveFamily(c.family.id), t("left", { family: c.family.name }));
                else run(() => removeFamilyMember(c.family.id, c.memberId), t("removed", { name: c.name }));
              }}
            >
              {confirm?.kind === "leave" ? t("leaveFamily") : t("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
