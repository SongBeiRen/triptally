import { z } from "zod";

/* ---------- vote primitives ---------- */

export type DestinationVoteValue = 2 | 1 | -1; // love it / into it / hard pass
export type DateVoteStatus = "yes" | "maybe" | "no";

export const PLACE_CATEGORIES = ["food", "drink", "sight", "activity", "nightlife"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const CATEGORY_META: Record<PlaceCategory, { emoji: string; label: string }> = {
  food: { emoji: "🍽️", label: "Food" },
  drink: { emoji: "🍹", label: "Drinks" },
  sight: { emoji: "📸", label: "Sights" },
  activity: { emoji: "🛶", label: "Activities" },
  nightlife: { emoji: "🪩", label: "Nightlife" },
};

/* ---------- API DTOs ---------- */

export type TripDTO = {
  id: string;
  name: string;
  inviteCode: string;
  budget: string | null;
  vibes: string[];
  notes: string | null;
  deadline: number | null; // epoch ms
  anonymize: boolean;
  createdAt: number;
};

export type ParticipantDTO = {
  id: string;
  name: string;
  emoji: string;
  isAdmin: boolean;
};

export type DateOptionDTO = {
  id: string;
  label: string | null;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  /** participantId -> status */
  votes: Record<string, DateVoteStatus>;
  tally: { yes: number; maybe: number; no: number };
};

export type DestinationDTO = {
  id: string;
  name: string;
  country: string | null;
  blurb: string | null;
  /** participantId -> 2 | 1 | -1 */
  votes: Record<string, DestinationVoteValue>;
  tally: { love: number; like: number; nope: number; score: number };
};

export type PlaceDTO = {
  id: string;
  name: string;
  category: PlaceCategory;
  note: string | null;
  addedBy: ParticipantDTO | null;
  voterIds: string[];
};

/** Which parts of the plan are already decided (deadline passed → locked). */
export type DecisionState = {
  locked: boolean;
  winnerDestinationId: string | null; // current leader if open, winner if locked
  bestDateOptionId: string | null;
};

export type TripState = {
  trip: TripDTO;
  participants: ParticipantDTO[];
  me: ParticipantDTO | null;
  isAdmin: boolean;
  dateOptions: DateOptionDTO[];
  destinations: DestinationDTO[];
  places: PlaceDTO[];
  plan: Itinerary | null;
  planGeneratedBy: "ai" | "fallback" | null;
  decision: DecisionState;
};

/* ---------- itinerary (shared by LLM + fallback planner) ---------- */

export const ITINERARY_ITEM_KINDS = ["food", "drink", "sight", "activity", "nightlife", "travel", "stay"] as const;

export const itineraryItemSchema = z.object({
  time: z.string(), // "09:30"
  title: z.string(),
  kind: z.enum(ITINERARY_ITEM_KINDS),
  place: z.string().optional(), // shortlisted place name this maps to
  note: z.string().optional(),
});

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  morning: z.array(itineraryItemSchema).default([]),
  afternoon: z.array(itineraryItemSchema).default([]),
  evening: z.array(itineraryItemSchema).default([]),
});

export const itinerarySchema = z.object({
  destination: z.string(),
  summary: z.string(),
  days: z.array(itineraryDaySchema).min(1),
});

export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type ItineraryDay = z.infer<typeof itineraryDaySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;

export const ITEM_KIND_META: Record<ItineraryItem["kind"], string> = {
  food: "🍽️",
  drink: "🍹",
  sight: "📸",
  activity: "🛶",
  nightlife: "🪩",
  travel: "🚌",
  stay: "🛏️",
};
