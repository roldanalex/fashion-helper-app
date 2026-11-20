import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { openWardrobe, type Wardrobe } from "@/lib/wardrobe";
import { supabaseStore } from "@/lib/wardrobe/supabase";
import { buildPersonContext, type AccountProfile, type PersonContext } from "@/lib/people/context";
import { resolveLocale } from "@/i18n/request";
import type { Locale } from "@/i18n/config";
import type { Person } from "@/types/database";

/** The requested Person is not one this Account dresses (deleted, or never theirs). */
export class PersonNotFoundError extends Error {
  constructor() {
    super("That person is not on this account.");
  }
}

/** Cookie holding the Active person's id (validated on every read). */
export const ACTIVE_PERSON_COOKIE = "aether-person";

export interface PersonSession {
  supabase: SupabaseClient;
  user: User;
  /** Everyone this Account may dress (edit), Self first. */
  people: Person[];
  /**
   * Everyone this Account may see: the People above plus, through linked
   * Families, Managed people it may only view and members who share their
   * own wardrobe. Used by Family looks; never by the switcher.
   */
  viewablePeople: Person[];
  active: PersonContext;
  wardrobe: Wardrobe;
  accountProfile: AccountProfile | null;
  /** The language on screen for this request; AI text is written in it. */
  locale: Locale;
  /** Open another Person's wardrobe, if this Account may edit them. */
  wardrobeFor(personId: string): Wardrobe | null;
  /** Read-only use: a wardrobe this Account may view (writes are refused by the database). */
  viewWardrobeFor(personId: string): Wardrobe | null;
  /** Whether this Account may edit (dress) that Person. */
  canEdit(personId: string): boolean;
  contextFor(personId: string): PersonContext | null;
}

function orderPeople(people: Person[]): Person[] {
  return [...people].sort(
    (a, b) =>
      Number(b.kind === "self") - Number(a.kind === "self") ||
      a.created_at.localeCompare(b.created_at),
  );
}

/**
 * The signed-in Account, the People it looks after and the Active person's
 * Wardrobe. `requestedPersonId` overrides the cookie (API routes pass the
 * Person the page was showing) and is strict: an id this Account does not
 * dress throws PersonNotFoundError instead of falling back to Self, so a
 * stale tab can never write into the wrong wardrobe. The cookie is lenient.
 */
export async function personSessionFor(
  supabase: SupabaseClient,
  user: User,
  requestedPersonId?: string | null,
): Promise<PersonSession> {
  const [{ data: peopleData, error }, { data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("people").select("*"),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("family_members").select("family_id, role").eq("user_id", user.id),
  ]);
  if (error) {
    console.error("Loading people failed (has migration 0011 been run?):", error.message);
    throw new Error("Could not load the people on this account.");
  }

  // RLS returns everyone this Account may view. It may dress its own self
  // Person and the Managed people of Families it owns or manages.
  const managed = new Set(
    ((memberships ?? []) as { family_id: string; role: string }[])
      .filter((m) => m.role === "owner" || m.role === "manager")
      .map((m) => m.family_id),
  );
  const viewablePeople = orderPeople((peopleData ?? []) as Person[]);
  const people = viewablePeople.filter(
    (p) =>
      (p.kind === "self" && p.account_user_id === user.id) ||
      (p.kind === "managed" && managed.has(p.family_id)),
  );
  const self = people.find((p) => p.kind === "self" && p.account_user_id === user.id);
  if (!self) throw new Error("This account has no self person yet (run migration 0011).");

  if (requestedPersonId && !people.some((p) => p.id === requestedPersonId)) {
    throw new PersonNotFoundError();
  }
  let wanted = requestedPersonId ?? null;
  if (!wanted) {
    try {
      wanted = (await cookies()).get(ACTIVE_PERSON_COOKIE)?.value ?? null;
    } catch {
      wanted = null;
    }
  }
  const activePerson = people.find((p) => p.id === wanted) ?? self;
  const accountProfile = (profile ?? null) as AccountProfile | null;
  const locale = await resolveLocale();
  const store = supabaseStore(supabase);

  return {
    supabase,
    user,
    people,
    viewablePeople,
    accountProfile,
    locale,
    active: buildPersonContext(activePerson, accountProfile, user.id),
    wardrobe: openWardrobe(store, { personId: activePerson.id, accountId: user.id }),
    wardrobeFor(personId) {
      return people.some((p) => p.id === personId)
        ? openWardrobe(store, { personId, accountId: user.id })
        : null;
    },
    viewWardrobeFor(personId) {
      return viewablePeople.some((p) => p.id === personId)
        ? openWardrobe(store, { personId, accountId: user.id })
        : null;
    },
    canEdit(personId) {
      return people.some((p) => p.id === personId);
    },
    contextFor(personId) {
      const p = viewablePeople.find((x) => x.id === personId);
      return p ? buildPersonContext(p, accountProfile, user.id) : null;
    },
  };
}

/**
 * For server components and actions: null when nobody is signed in or the
 * requested Person is not on this Account.
 */
export async function personSession(requestedPersonId?: string | null): Promise<PersonSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    return await personSessionFor(supabase, user, requestedPersonId);
  } catch (err) {
    if (err instanceof PersonNotFoundError) return null;
    throw err;
  }
}

/**
 * For API routes: the session, or a ready 404 response when the requested
 * Person is not on this Account.
 */
export async function personSessionOr404(
  supabase: SupabaseClient,
  user: User,
  requestedPersonId?: string | null,
): Promise<{ session: PersonSession; deny?: never } | { session?: never; deny: Response }> {
  try {
    return { session: await personSessionFor(supabase, user, requestedPersonId) };
  } catch (err) {
    if (!(err instanceof PersonNotFoundError)) throw err;
    return {
      deny: Response.json(
        { error: { code: "person_not_found", message: "That person is no longer on your account. Reload the page." } },
        { status: 404 },
      ),
    };
  }
}
