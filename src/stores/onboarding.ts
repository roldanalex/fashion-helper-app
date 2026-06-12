import { create } from "zustand";
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

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  draft: initialDraft,
  step: 0,
  set: (fields) => set((s) => ({ draft: { ...s.draft, ...fields } })),
  setStep: (step) => set({ step }),
  reset: () => set({ draft: initialDraft, step: 0 }),
}));
