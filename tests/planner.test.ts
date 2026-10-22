import { describe, expect, it } from "vitest";
import { buildFallbackPlan, planDayCount, seededShuffle } from "@/lib/planner";
import type { PlaceDTO, TripState } from "@/lib/types";

function makeState(overrides: Partial<TripState> = {}): TripState {
  return {
    trip: {
      id: "t1",
      name: "Squad city break",
      inviteCode: "AAAAAA",
      budget: "€500",
      vibes: ["food", "chill"],
      notes: null,
      deadline: null,
      anonymize: false,
      createdAt: Date.now(),
    },
    participants: [
      { id: "p1", name: "Marta", emoji: "🦊", isAdmin: true },
      { id: "p2", name: "Jonas", emoji: "🐻", isAdmin: false },
    ],
    me: { id: "p1", name: "Marta", emoji: "🦊", isAdmin: true },
    isAdmin: true,
    dateOptions: [
      {
        id: "o1",
        label: null,
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        votes: { p1: "yes", p2: "yes" },
        tally: { yes: 2, maybe: 0, no: 0 },
      },
    ],
    destinations: [
      {
        id: "d1",
        name: "Lisbon",
        country: "Portugal",
        blurb: null,
        votes: { p1: 2, p2: 2 },
        tally: { love: 2, like: 0, nope: 0, score: 4 },
      },
      {
        id: "d2",
        name: "Oslo",
        country: "Norway",
        blurb: null,
        votes: {},
        tally: { love: 0, like: 0, nope: 0, score: 0 },
      },
    ],
    places: [],
    plan: null,
    planGeneratedBy: null,
    decision: { locked: false, winnerDestinationId: "d1", bestDateOptionId: "o1" },
    ...overrides,
  };
}

describe("seededShuffle", () => {
  it("is deterministic for the same seed", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], "seed");
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], "seed");
    expect(a).toEqual(b);
  });

  it("keeps all elements", () => {
    const src = [1, 2, 3, 4, 5];
    expect([...seededShuffle(src, "x")].sort()).toEqual(src);
  });

  it("varies across seeds (eventually)", () => {
    const first = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], "a");
    const different = ["b", "c", "d", "e"].some((s) => seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], s).join() !== first.join());
    expect(different).toBe(true);
  });
});

describe("buildFallbackPlan", () => {
  it("plans for the voted winner", () => {
    const plan = buildFallbackPlan(makeState(), 3);
    expect(plan.destination).toBe("Lisbon");
  });

  it("covers exactly the requested days", () => {
    const plan = buildFallbackPlan(makeState(), 4);
    expect(plan.days).toHaveLength(4);
    expect(plan.days.map((d) => d.day)).toEqual([1, 2, 3, 4]);
  });

  it("every day has morning/afternoon/evening", () => {
    const plan = buildFallbackPlan(makeState(), 2);
    for (const day of plan.days) {
      expect(day.morning.length).toBeGreaterThan(0);
      expect(day.afternoon.length).toBeGreaterThan(0);
      expect(day.evening.length).toBeGreaterThan(0);
    }
  });

  it("weaves shortlisted places into the plan", () => {
    const places: PlaceDTO[] = [
      {
        id: "pl1",
        name: "Time Out Market",
        category: "food",
        note: null,
        addedBy: null,
        voterIds: ["p1", "p2"],
      },
    ];
    const plan = buildFallbackPlan(makeState({ places }), 3);
    const titles = plan.days.flatMap((d) => [...d.morning, ...d.afternoon, ...d.evening].map((i) => i.title));
    expect(titles).toContain("Time Out Market");
  });

  it("different seeds produce different plans (regenerate works)", () => {
    const state = makeState();
    const a = buildFallbackPlan(state, 3, 1);
    const b = buildFallbackPlan(state, 3, 2);
    expect(a).not.toEqual(b);
  });

  it("falls back gracefully to generic items for unknown cities", () => {
    const state = makeState({
      destinations: [
        {
          id: "dx",
          name: "Reykjavík",
          country: "Iceland",
          blurb: null,
          votes: { p1: 2 },
          tally: { love: 1, like: 0, nope: 0, score: 2 },
        },
      ],
    });
    const plan = buildFallbackPlan(state, 2);
    expect(plan.destination).toBe("Reykjavík");
    expect(plan.days).toHaveLength(2);
  });
});

describe("planDayCount", () => {
  it("uses the winning date window length, capped at 7", () => {
    const state = makeState({
      dateOptions: [
        {
          id: "o1",
          label: null,
          startDate: "2026-06-01",
          endDate: "2026-06-12",
          votes: {},
          tally: { yes: 0, maybe: 0, no: 0 },
        },
      ],
    });
    expect(planDayCount(state)).toBe(7);
  });

  it("defaults to 3 days without date options", () => {
    expect(planDayCount(makeState({ dateOptions: [] }))).toBe(3);
  });
});
