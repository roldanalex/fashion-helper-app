import type { UIDataTypes, UIMessage } from "ai";
import type {
  FindOutfitsInput,
  FindOutfitsResult,
  PlanTripInput,
  PlanTripResult,
} from "@/lib/trips/schema";

/** Tools the stylist chat can call, typed for both the route and the UI. */
export type StylistUITools = {
  plan_trip: { input: PlanTripInput; output: PlanTripResult };
  find_outfits: { input: FindOutfitsInput; output: FindOutfitsResult };
};

export type StylistUIMessage = UIMessage<never, UIDataTypes, StylistUITools>;
