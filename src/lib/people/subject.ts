/**
 * What the AI may know about a Person (docs/adr/0002). Every prompt that
 * describes who an outfit is for builds that text here, and only here.
 *
 * Adults: styles, formality and the full personal-fit block (build, colouring,
 * fit, notes). Minors: an alias and a coarse audience only; never a name, age,
 * colouring, measurements, notes or preferences.
 */
import { describeClient, type PersonalProfile } from "@/lib/personal/client-profile";
import type { AgeBand } from "@/types/database";

export type Audience = "adult" | "teen" | "child";

/** What a caller knows about the Person; built by loadPerson(). */
export interface SubjectSource {
  display_name: string;
  age_band: AgeBand;
  styles: string[];
  formality: number | null;
  personal: PersonalProfile | null;
}

export interface PromptSubject {
  /** "Person 1" for adults, "Child A" / "Teen B" for Minors. Never a name. */
  alias: string;
  audience: Audience;
  isMinor: boolean;
  /** describeClient() for adults; always "" for Minors. */
  personalBlock: string;
  /** "Styles: … Preferred formality: n/10." for adults; a fixed line for Minors. */
  styleLine: string;
  /** Extra scoring and styling guidance for children and teens; "" for adults. */
  audienceGuide: string;
}

const AUDIENCE: Record<AgeBand, Audience> = {
  adult: "adult",
  teen: "teen",
  child: "child",
  toddler: "child",
};

const GUIDE: Record<Audience, string> = {
  adult: "",
  child:
    "This is a children's wardrobe. Favour comfort, freedom to move and play, durable easy-care fabrics and age-appropriate looks. Read old_money_score as 'classic and timeless'; never judge the child, only the clothes.",
  teen:
    "This is a teenager's wardrobe. Favour comfort, current but not costume-like looks and versatile pieces. Read old_money_score as 'classic and timeless'; never judge the teen, only the clothes.",
};

const letter = (n: number) => String.fromCharCode(65 + (n % 26));

export function isMinorBand(band: AgeBand): boolean {
  return band !== "adult";
}

const MINOR_STYLE_LINE = "Styles: practical, age-appropriate everyday clothes.";

function styleLine(src: SubjectSource): string {
  if (isMinorBand(src.age_band)) return MINOR_STYLE_LINE;
  const styles = src.styles.length ? src.styles.join(", ") : "smart casual";
  return `Styles: ${styles}. Preferred formality: ${src.formality ?? 5}/10.`;
}

/**
 * The prompt-safe view of one Person. `index` numbers the Person among
 * adults (Person 1, 2…) or Minors (Child A, Teen B…) when several share a prompt.
 */
export function promptSubject(src: SubjectSource, index = 0): PromptSubject {
  const audience = AUDIENCE[src.age_band] ?? "adult";
  const isMinor = isMinorBand(src.age_band);
  return {
    alias: isMinor
      ? `${audience === "teen" ? "Teen" : "Child"} ${letter(index)}`
      : `Person ${index + 1}`,
    audience,
    isMinor,
    personalBlock: isMinor ? "" : describeClient(src.personal),
    styleLine: styleLine(src),
    audienceGuide: GUIDE[audience],
  };
}

/** Subjects for several People in one prompt: adults numbered, Minors lettered. */
export function subjectsFor(sources: SubjectSource[]): PromptSubject[] {
  let adults = 0;
  let minors = 0;
  return sources.map((src) => {
    return promptSubject(src, isMinorBand(src.age_band) ? minors++ : adults++);
  });
}
