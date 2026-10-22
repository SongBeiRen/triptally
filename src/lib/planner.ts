import { CURATED_CITIES, GENERIC_ITEMS, type CuratedItem } from "./planner-data";
import { formatDateRange, nightsBetween } from "./decision";
import type { Itinerary, ItineraryDay, ItineraryItem, PlaceDTO, TripState } from "./types";

/**
 * Deterministic offline planner. Interleaves the group's top-voted shortlist with
 * curated picks for the winning destination. Seeded by `seed` so "Regenerate"
 * produces a different but still-sane plan.
 */
export function buildFallbackPlan(state: TripState, days: number, seed = 1): Itinerary {
  const winner = state.destinations.find((d) => d.id === state.decision.winnerDestinationId) ??
    state.destinations[0] ?? { name: state.trip.name || "your trip", country: null };

  const city = CURATED_CITIES.find(
    (c) => c.name.toLowerCase() === winner.name.toLowerCase().trim(),
  );
  const pool: CuratedItem[] = city ? [...city.items] : [...GENERIC_ITEMS];
  // deterministic shuffle per seed
  const shuffled = seededShuffle(pool, `${winner.name}:${seed}`);

  // group shortlist: top-voted places first, newest as tiebreak
  const shortlist = [...state.places]
    .sort((a, b) => b.voterIds.length - a.voterIds.length || a.name.localeCompare(b.name))
    .map((p) => ({
      title: p.name,
      kind: p.category,
      slot: slotForCategory(p.category),
      time: timeForSlot(slotForCategory(p.category)),
      note: p.note ?? (p.voterIds.length > 0 ? `${p.voterIds.length} friend${p.voterIds.length > 1 ? "s" : ""} shortlisted this` : undefined),
      fromGroup: true,
    })) as (CuratedItem & { fromGroup?: boolean })[];

  const usedTitles = new Set<string>();
  type Slot = "morning" | "afternoon" | "evening";
  const nextFrom = (slot: Slot): ItineraryItem => {
    const fromGroup = shortlist.find((s) => s.slot === slot && !usedTitles.has(s.title));
    if (fromGroup) {
      usedTitles.add(fromGroup.title);
      return toItem(fromGroup);
    }
    const curated =
      shuffled.find((s) => s.slot === slot && !usedTitles.has(s.title)) ??
      shuffled.find((s) => !usedTitles.has(s.title)) ?? {
        title: "Free time — wander",
        kind: "activity" as const,
        slot,
        time: timeForSlot(slot),
      };
    usedTitles.add(curated.title);
    return toItem(curated);
  };

  const dayList: ItineraryDay[] = [];
  for (let day = 1; day <= days; day++) {
    dayList.push({
      day,
      title: dayTitle(day, days, city?.name ?? winner.name),
      morning: day === 1 ? [arrivalItem(), nextFrom("morning")] : [nextFrom("morning")],
      afternoon: [nextFrom("afternoon")],
      evening: day === days ? [nextFrom("evening"), departureItem()] : [nextFrom("evening")],
    });
  }

  const dateRange = state.dateOptions.find((o) => o.id === state.decision.bestDateOptionId);
  const summaryParts = [
    `${days} day${days > 1 ? "s" : ""} in ${winner.name}`,
    dateRange ? `around ${formatDateRange(dateRange.startDate, dateRange.endDate)}` : null,
    state.trip.budget ? `budget: ${state.trip.budget}` : null,
    state.trip.vibes.length ? `vibe: ${state.trip.vibes.join(", ")}` : null,
  ].filter(Boolean);

  return {
    destination: winner.name,
    summary: `${summaryParts.join(" · ")} — built from ${state.participants.length} friends' votes.`,
    days: dayList,
  };
}

function toItem(c: CuratedItem & { fromGroup?: boolean }): ItineraryItem {
  return {
    time: c.time,
    title: c.title,
    kind: c.kind,
    note: c.note ?? (c.fromGroup ? "From your group shortlist ⭐" : undefined),
  };
}

function slotForCategory(cat: PlaceDTO["category"]): "morning" | "afternoon" | "evening" {
  switch (cat) {
    case "food":
      return "afternoon";
    case "drink":
    case "nightlife":
      return "evening";
    case "sight":
      return "morning";
    case "activity":
      return "afternoon";
  }
}

function timeForSlot(slot: "morning" | "afternoon" | "evening") {
  return slot === "morning" ? "10:00" : slot === "afternoon" ? "14:00" : "20:00";
}

function dayTitle(day: number, total: number, city: string) {
  if (day === 1) return `Arrival day — first taste of ${city}`;
  if (day === total) return `Last day — the slow goodbye`;
  const titles = ["Deep dive day", "Local day", "Adventure day", "Slow morning day", "Big night day"];
  return titles[(day - 2) % titles.length];
}

function arrivalItem(): ItineraryItem {
  return { time: "08:30", title: "Everyone lands / checks in", kind: "travel", note: "Drop bags, group chat meetup point" };
}

function departureItem(): ItineraryItem {
  return { time: "22:00", title: "Airports, hugs, next trip poll", kind: "travel" };
}

/** Mulberry32-ish deterministic shuffle from a string seed. */
export function seededShuffle<T>(items: T[], seedStr: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** How many days the plan should cover (from the winning date option, capped). */
export function planDayCount(state: TripState): number {
  const best = state.dateOptions.find((o) => o.id === state.decision.bestDateOptionId);
  if (best) return Math.min(7, Math.max(1, nightsBetween(best.startDate, best.endDate)));
  return 3;
}
