import { describe, expect, it } from "vitest";
import {
  bestDateOption,
  computeDecision,
  dateOptionTally,
  dateScore,
  destinationTally,
  destinationWinner,
  formatDateRange,
  nightsBetween,
} from "@/lib/decision";
import type { DateOptionDTO, DateVoteStatus, DestinationDTO } from "@/lib/types";

function dest(id: string, name: string, votes: Record<string, 2 | 1 | -1>): DestinationDTO {
  return { id, name, country: null, blurb: null, votes, tally: destinationTally(votes) };
}

function opt(id: string, start: string, votes: Record<string, DateVoteStatus>): DateOptionDTO {
  return { id, label: null, startDate: start, endDate: start, votes, tally: dateOptionTally(votes) };
}

describe("destinationTally", () => {
  it("scores love=2, like=1, nope=-1", () => {
    expect(destinationTally({ a: 2, b: 2, c: 1, d: -1 })).toEqual({ love: 2, like: 1, nope: 1, score: 4 });
  });
  it("empty votes give zero signal", () => {
    expect(destinationTally({})).toEqual({ love: 0, like: 0, nope: 0, score: 0 });
  });
});

describe("destinationWinner", () => {
  it("picks the highest score", () => {
    const a = dest("a", "Lisbon", { p1: 2, p2: 1 });
    const b = dest("b", "Oslo", { p1: 1 });
    expect(destinationWinner([a, b])?.id).toBe("a");
  });

  it("tie-breaks on love votes", () => {
    const a = dest("a", "Rome", { p1: 1, p2: 1 }); // score 2, love 0
    const b = dest("b", "Athens", { p1: 2, p2: -1 }); // score 1... wait, that's score 1
    // make a real tie: b = 2 + 0 = 2 with one love
    const c = dest("c", "Berlin", { p1: 2 }); // score 2, love 1
    expect(destinationWinner([a, c])?.id).toBe("c");
    expect(b).toBeDefined();
  });

  it("returns null when nobody voted", () => {
    expect(destinationWinner([dest("a", "Rome", {})])).toBeNull();
    expect(destinationWinner([])).toBeNull();
  });

  it("ignores a pure negative leaderboard", () => {
    expect(destinationWinner([dest("a", "Rome", { p1: -1, p2: -1 })])).toBeNull();
  });
});

describe("date availability", () => {
  it("weights yes > maybe, penalizes no", () => {
    expect(dateScore({ yes: 3, maybe: 1, no: 0 })).toBeGreaterThan(dateScore({ yes: 2, maybe: 0, no: 1 }));
  });

  it("bestDateOption picks the overlap winner", () => {
    const early = opt("o1", "2026-06-01", { p1: "yes", p2: "yes", p3: "maybe" });
    const late = opt("o2", "2026-07-01", { p1: "yes", p2: "no", p3: "no" });
    expect(bestDateOption([late, early])?.id).toBe("o1");
  });

  it("empty options → null", () => {
    expect(bestDateOption([])).toBeNull();
  });
});

describe("computeDecision", () => {
  const dests = [dest("d1", "Lisbon", { p1: 2 }), dest("d2", "Porto", { p1: 1 })];
  const opts = [opt("o1", "2026-06-01", { p1: "yes" })];

  it("open before the deadline", () => {
    const d = computeDecision(dests, opts, Date.now() + 10_000);
    expect(d.locked).toBe(false);
    expect(d.winnerDestinationId).toBe("d1");
  });

  it("locked after the deadline", () => {
    const d = computeDecision(dests, opts, Date.now() - 1);
    expect(d.locked).toBe(true);
  });

  it("no deadline = never locked", () => {
    expect(computeDecision(dests, opts, null).locked).toBe(false);
  });
});

describe("date helpers", () => {
  it("counts nights between dates", () => {
    expect(nightsBetween("2026-06-01", "2026-06-04")).toBe(3);
    expect(nightsBetween("2026-06-01", "2026-06-01")).toBe(1);
    expect(nightsBetween("2026-06-04", "2026-06-01")).toBe(1); // inverted → safe default
  });

  it("formats ranges", () => {
    const s = formatDateRange("2026-06-01", "2026-06-04");
    expect(s).toContain("Jun");
    expect(s).toContain("→");
  });
});
