import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProfileInput } from "@/lib/schemas";

export type OnboardingDraft = Partial<ProfileInput>;

interface OnboardingStore {
  draft: OnboardingDraft;
  step: number;
  set: (fields: OnboardingDraft) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

const initialDraft: OnboardingDraft = {
  preferred_formality: 5,
  style_preferences: [],
  lifestyle_tags: [],
};

/** Kept in sessionStorage so a reload or a dropped connection doesn't lose answers. */
export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      draft: initialDraft,
      step: 0,
      set: (fields) => set((s) => ({ draft: { ...s.draft, ...fields } })),
      setStep: (step) => set({ step }),
      reset: () => set({ draft: initialDraft, step: 0 }),
    }),
    {
      name: "aether-onboarding",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
