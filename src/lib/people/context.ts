/**
 * Everything the app needs to know about one Person, assembled once:
 * who they are, their styles, their personal-fit traits (from the Account's
 * profile for Self, from the people row for a Managed person) and the
 * prompt-safe view of them (PromptSubject).
 */
import type { PersonalProfile } from "@/lib/personal/client-profile";
import { isMinorBand, promptSubject, type PromptSubject, type SubjectSource } from "@/lib/people/subject";
import type { Person, Profile } from "@/types/database";

export interface PersonContext {
  person: Person;
  isSelf: boolean;
  isMinor: boolean;
  styles: string[];
  formality: number | null;
  /** Traits for our own deterministic code (face fit). Never put in prompts directly. */
  personal: PersonalProfile;
  /** Prompt-safe view; the only thing AI calls may use. */
  subject: PromptSubject;
  source: SubjectSource;
}

/** Shared by the whole Family: where they live and how they read temperatures. */
export type AccountProfile = Pick<Profile, "home_location" | "home_lat" | "home_lon" | "units"> &
  Partial<Profile>;

/**
 * `accountId` is the signed-in Account. Only that Account's own self Person
 * reads traits from its profile; another member's self Person (seen through a
 * linked Family) carries no traits here, because their profile is private.
 */
export function buildPersonContext(
  person: Person,
  accountProfile: AccountProfile | null,
  accountId?: string,
): PersonContext {
  const isSelf = person.kind === "self" && (accountId == null || person.account_user_id === accountId);
  const units = accountProfile?.units ?? "metric";

  const personal: PersonalProfile = isSelf
    ? { ...(accountProfile ?? {}), units }
    : {
        gender: person.gender,
        // A Managed person has an age band, not an age range.
        skin_tone: person.skin_tone,
        skin_undertone: person.skin_undertone,
        hair_color: person.hair_color,
        eye_color: person.eye_color,
        color_season: person.color_season,
        height_cm: person.height_cm,
        body_shape: person.body_shape,
        fit_preference: person.fit_preference,
        style_notes: person.style_notes,
        units,
      };

  const styles = isSelf ? (accountProfile?.style_preferences ?? []) : person.style_preferences;
  const formality = isSelf ? (accountProfile?.preferred_formality ?? null) : person.preferred_formality;

  const source: SubjectSource = {
    display_name: person.display_name,
    age_band: person.age_band,
    styles,
    formality,
    personal,
  };

  return {
    person,
    isSelf,
    isMinor: isMinorBand(person.age_band),
    styles,
    formality,
    personal,
    subject: promptSubject(source),
    source,
  };
}
