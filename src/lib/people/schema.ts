import { z } from "zod";
import { personalSchema } from "@/lib/schemas";
import { STYLE_PREFERENCES } from "@/lib/constants";

export const AGE_BANDS = ["adult", "teen", "child", "toddler"] as const;

export const AGE_BAND_LABELS: Record<(typeof AGE_BANDS)[number], string> = {
  adult: "Adult",
  teen: "Teen (13–17)",
  child: "Child (4–12)",
  toddler: "Toddler (0–3)",
};

/**
 * A Managed person as entered in Settings → People. Minors keep only the
 * minimum (docs/adr/0002): no height, body shape or notes, and a parent or
 * guardian must vouch for them.
 */
export const managedPersonSchema = z
  .object({
    display_name: z.string().trim().min(1, "nameRequired").max(40, "nameTooLong"),
    age_band: z.enum(AGE_BANDS),
    guardian: z.boolean().optional(),
    style_preferences: z.array(z.enum(STYLE_PREFERENCES.map((s) => s.value) as [string, ...string[]])),
    preferred_formality: z.number().int().min(1).max(10),
    personal: personalSchema
      .pick({
        gender: true,
        skin_tone: true,
        skin_undertone: true,
        hair_color: true,
        eye_color: true,
        height_cm: true,
        body_shape: true,
        fit_preference: true,
        style_notes: true,
      })
      .partial(),
  })
  .refine((p) => p.age_band === "adult" || p.guardian === true, {
    message: "guardianRequired",
    path: ["guardian"],
  });

export type ManagedPersonInput = z.infer<typeof managedPersonSchema>;
