import type {
  DateOptionDTO,
  DecisionState,
  DestinationDTO,
  DestinationVoteValue,
} from "./types";

/* ---------- destination tallies ---------- */

export function destinationTally(votes: Record<string, DestinationVoteValue>) {
  let love = 0;
  let like = 0;
  let nope = 0;
  for (const v of Object.values(votes)) {
    if (v === 2) love++;
    else if (v === 1) like++;
    else if (v === -1) nope++;
  }
  return { love, like, nope, score: love * 2 + like - nope };
}

/**
 * Winner = highest score, tie-break: most "love it" votes, then fewest "hard pass",
 * then name (stable). Returns null when there are no destinations or the top two
 * are fully tied at zero signal.
 */
export function destinationWinner(destinations: DestinationDTO[]): DestinationDTO | null {
  if (destinations.length === 0) return null;
  const ranked = [...destinations].sort((a, b) => {
    if (b.tally.score !== a.tally.score) return b.tally.score - a.tally.score;
    if (b.tally.love !== a.tally.love) return b.tally.love - a.tally.love;
    if (a.tally.nope !== b.tally.nope) return a.tally.nope - b.tally.nope;
    return a.name.localeCompare(b.name);
  });
  const top = ranked[0];
  if (top.tally.score <= 0 && top.tally.love === 0) return null; // nobody cares yet
  return top;
}

/* ---------- date availability ---------- */

export function dateOptionTally(votes: Record<string, string>) {
  let yes = 0;
  let maybe = 0;
  let no = 0;
  for (const v of Object.values(votes)) {
    if (v === "yes") yes++;
    else if (v === "maybe") maybe++;
    else if (v === "no") no++;
  }
  return { yes, maybe, no };
}

/** Overlap score: yes counts double, maybe counts once, no hurts. */
export function dateScore(tally: { yes: number; maybe: number; no: number }) {
  return tally.yes * 2 + tally.maybe - tally.no * 2;
}

export function bestDateOption(options: DateOptionDTO[]): DateOptionDTO | null {
  if (options.length === 0) return null;
  return [...options].sort((a, b) => {
    const d = dateScore(b.tally) - dateScore(a.tally);
    if (d !== 0) return d;
    if (b.tally.yes !== a.tally.yes) return b.tally.yes - a.tally.yes;
    return a.startDate.localeCompare(b.startDate);
  })[0];
}

/* ---------- decision state ---------- */

export function computeDecision(
  destinations: DestinationDTO[],
  dateOptions: DateOptionDTO[],
  deadline: number | null,
  now = Date.now(),
): DecisionState {
  const locked = deadline !== null && now >= deadline;
  const winner = destinationWinner(destinations);
  return {
    locked,
    winnerDestinationId: winner?.id ?? null,
    bestDateOptionId: bestDateOption(dateOptions)?.id ?? null,
  };
}

/** Days between two ISO dates (inclusive of start day), min 1. */
export function nightsBetween(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00Z`).getTime();
  const end = new Date(`${endISO}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

export function formatDateRange(startISO: string, endISO: string): string {
  const fmt = (iso: string, withYear: boolean) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  };
  if (startISO === endISO) return fmt(startISO, true);
  const sameYear = startISO.slice(0, 4) === endISO.slice(0, 4);
  return `${fmt(startISO, !sameYear)} → ${fmt(endISO, true)}`;
}
