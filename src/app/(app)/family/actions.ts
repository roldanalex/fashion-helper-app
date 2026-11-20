"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { personSession } from "@/lib/people/session";
import { OCCASION_WEIGHTS } from "@/lib/constants";

const wearSchema = z.object({
  personId: z.string(),
  outfitId: z.string(),
  occasion: z.string().refine((o) => o in OCCASION_WEIGHTS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** The client's local date, so "today" means the family's today. */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(600).optional(),
});

/**
 * "Wear this" on a Family look. Puts the Outfit first in that Person's plan
 * for the day and occasion, keeping any picks Today already made after it.
 * Only a look for today is recorded as worn (wear counts, resting); a look
 * for a later day is saved as the plan and counted when that day comes.
 */
export async function wearFamilyPick(input: unknown) {
  const t = await getTranslations("family");
  const parsed = wearSchema.safeParse(input);
  if (!parsed.success) return { error: t("errors.couldNotSaveOutfit") };
  const { personId, outfitId, occasion, date, today, note } = parsed.data;

  const session = await personSession();
  if (!session) return { error: t("errors.notSignedIn") };
  const wardrobe = session.wardrobeFor(personId);
  if (!wardrobe) return { error: t("errors.notOnAccount") };

  const [outfit] = await wardrobe.outfitsByIds([outfitId]);
  if (!outfit) return { error: t("errors.outfitGone") };

  const existing = await wardrobe.plan(date, occasion);
  const earlier = (existing?.recommendations ?? []).filter((r) => r.combination_id !== outfitId);
  const plan = await wardrobe.savePlan({
    plan_date: date,
    occasion,
    destination: existing?.destination ?? null,
    dest_lat: existing?.dest_lat ?? null,
    dest_lon: existing?.dest_lon ?? null,
    notes: existing?.notes ?? t("plan.notes"),
    weather: existing?.weather ?? null,
    recommendations: [
      {
        combination_id: outfitId,
        rank: 1,
        explanation: note || t("plan.explanation"),
        watch_id: outfit.watch_id,
        accessory_ids: outfit.accessory_ids,
      },
      ...earlier.map((r, i) => ({ ...r, rank: i + 2 })),
    ],
  });
  if (!plan) return { error: t("errors.couldNotSaveOutfit") };

  if (date === today) {
    const ok = await wardrobe.recordWorn(plan.id, outfitId).catch(() => false);
    if (!ok) return { error: t("errors.couldNotSaveOutfit") };
  }

  revalidatePath("/today");
  return { ok: true, worn: date === today };
}

/* ---------- Family link: invites and membership (0013) ---------- */

type FamilyT = Awaited<ReturnType<typeof getTranslations<"family">>>;

/** Database error codes → keys under family.rpcErrors (the friendly messages). */
const ERRORS: Record<string, string> = {
  not_manager: "notManager",
  bad_role: "badRole",
  self_invite: "selfInvite",
  not_approved: "notApproved",
  already_member: "alreadyMember",
  family_full: "familyFull",
  invite_not_found: "inviteNotFound",
  owner_cannot_leave: "ownerCannotLeave",
  not_owner: "notOwner",
};

function friendly(t: FamilyT, message: string | undefined, fallback: string) {
  const key = Object.keys(ERRORS).find((k) => message?.includes(k));
  return key ? t(`rpcErrors.${ERRORS[key]}`) : t(`rpcFallback.${fallback}`);
}

/** `fallback` is a key under family.rpcFallback. */
async function rpc(fn: string, args: Record<string, unknown>, fallback: string) {
  const t = await getTranslations("family");
  const session = await personSession();
  if (!session) return { error: t("errors.notSignedIn") };
  const { error } = await session.supabase.rpc(fn, args);
  if (error) {
    console.error(`${fn} failed:`, error.message);
    return { error: friendly(t, error.message, fallback) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const emailSchema = z.email().max(200);

export async function inviteToFamily(familyId: string, email: string, role: "manager" | "viewer") {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { error: (await getTranslations("family"))("errors.invalidEmail") };
  return rpc(
    "invite_to_family",
    { fid: familyId, invitee_email: parsed.data, invite_role: role === "viewer" ? "viewer" : "manager" },
    "invite",
  );
}

export async function acceptFamilyInvite(inviteId: string, share: boolean) {
  return rpc("accept_family_invite", { invite_id: inviteId, share }, "join");
}

export async function deleteFamilyInvite(inviteId: string) {
  return rpc("delete_family_invite", { invite_id: inviteId }, "deleteInvite");
}

export async function leaveFamily(familyId: string) {
  return rpc("leave_family", { fid: familyId }, "leave");
}

export async function removeFamilyMember(familyId: string, memberId: string) {
  return rpc("remove_family_member", { fid: familyId, member: memberId }, "remove");
}

export async function setShareSelf(familyId: string, share: boolean) {
  return rpc("set_share_self", { fid: familyId, share }, "share");
}
