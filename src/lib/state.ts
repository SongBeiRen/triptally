import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { computeDecision, dateOptionTally, destinationTally } from "./decision";
import type {
  DateOptionDTO,
  DestinationDTO,
  Itinerary,
  ParticipantDTO,
  PlaceCategory,
  PlaceDTO,
  TripState,
} from "./types";
import { getViewer } from "./session";

export async function loadTrip(tripId: string) {
  const rows = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId)).limit(1);
  return rows[0] ?? null;
}

export async function loadTripByInvite(inviteCode: string) {
  const rows = await db
    .select()
    .from(schema.trips)
    .where(eq(schema.trips.inviteCode, inviteCode.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

function toParticipantDTO(p: typeof schema.participants.$inferSelect): ParticipantDTO {
  return { id: p.id, name: p.name, emoji: p.emoji, isAdmin: p.isAdmin === 1 };
}

/** Assemble the full client-facing state for a trip in one read pass. */
export async function buildTripState(tripId: string): Promise<TripState | null> {
  const trip = await loadTrip(tripId);
  if (!trip) return null;

  const { participant, isAdmin } = await getViewer(tripId);

  const [participantRows, dateOptionRows, destinationRows, placeRows, planRows] = await Promise.all([
    db.select().from(schema.participants).where(eq(schema.participants.tripId, tripId)).orderBy(asc(schema.participants.createdAt)),
    db.select().from(schema.dateOptions).where(eq(schema.dateOptions.tripId, tripId)).orderBy(asc(schema.dateOptions.startDate)),
    db.select().from(schema.destinations).where(eq(schema.destinations.tripId, tripId)).orderBy(asc(schema.destinations.createdAt)),
    db.select().from(schema.places).where(eq(schema.places.tripId, tripId)).orderBy(desc(schema.places.createdAt)),
    db.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).orderBy(desc(schema.itineraries.createdAt)).limit(1),
  ]);

  const [dateVoteRows, destinationVoteRows, placeVoteRows] = await Promise.all([
    dateOptionRows.length
      ? db.select().from(schema.dateVotes).where(inArray(schema.dateVotes.optionId, dateOptionRows.map((o) => o.id)))
      : Promise.resolve([] as (typeof schema.dateVotes.$inferSelect)[]),
    destinationRows.length
      ? db
          .select()
          .from(schema.destinationVotes)
          .where(inArray(schema.destinationVotes.destinationId, destinationRows.map((d) => d.id)))
      : Promise.resolve([] as (typeof schema.destinationVotes.$inferSelect)[]),
    placeRows.length
      ? db.select().from(schema.placeVotes).where(inArray(schema.placeVotes.placeId, placeRows.map((p) => p.id)))
      : Promise.resolve([] as (typeof schema.placeVotes.$inferSelect)[]),
  ]);

  const participants = participantRows.map(toParticipantDTO);
  const participantById = new Map(participants.map((p) => [p.id, p]));

  const dateOptions: DateOptionDTO[] = dateOptionRows.map((o) => {
    const votes: DateOptionDTO["votes"] = {};
    for (const v of dateVoteRows) {
      if (v.optionId !== o.id || !participantById.has(v.participantId)) continue;
      votes[v.participantId] = v.status as DateOptionDTO["votes"][string];
    }
    return {
      id: o.id,
      label: o.label,
      startDate: o.startDate,
      endDate: o.endDate,
      votes,
      tally: dateOptionTally(votes),
    };
  });

  const destinations: DestinationDTO[] = destinationRows.map((d) => {
    const votes: DestinationDTO["votes"] = {};
    for (const v of destinationVoteRows) {
      if (v.destinationId !== d.id || !participantById.has(v.participantId)) continue;
      votes[v.participantId] = v.value as DestinationDTO["votes"][string];
    }
    return {
      id: d.id,
      name: d.name,
      country: d.country,
      blurb: d.blurb,
      votes,
      tally: destinationTally(votes),
    };
  });

  const places: PlaceDTO[] = placeRows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category as PlaceCategory,
    note: p.note,
    addedBy: p.addedBy ? (participantById.get(p.addedBy) ?? null) : null,
    voterIds: placeVoteRows.filter((v) => v.placeId === p.id && participantById.has(v.participantId)).map((v) => v.participantId),
  }));

  const latestPlan = planRows[0] ?? null;
  let plan: Itinerary | null = null;
  if (latestPlan) {
    try {
      plan = JSON.parse(latestPlan.payload) as Itinerary;
    } catch {
      plan = null;
    }
  }

  return {
    trip: {
      id: trip.id,
      name: trip.name,
      inviteCode: trip.inviteCode,
      budget: trip.budget,
      vibes: JSON.parse(trip.vibes) as string[],
      notes: trip.notes,
      deadline: trip.deadline,
      anonymize: trip.anonymize === 1,
      createdAt: trip.createdAt,
    },
    participants,
    me: participant ? toParticipantDTO(participant) : null,
    isAdmin,
    dateOptions,
    destinations,
    places,
    plan,
    planGeneratedBy: plan ? latestPlan!.generatedBy as "ai" | "fallback" : null,
    decision: computeDecision(destinations, dateOptions, trip.deadline),
  };
}
