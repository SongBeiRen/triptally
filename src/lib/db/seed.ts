import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { newAdminToken } from "../ids";

const DAY = 86_400_000;

function iso(offsetDays: number) {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

/**
 * Demo trip so a fresh clone (or a portfolio reviewer opening the app alone)
 * lands in a room that already feels alive: 5 friends mid-vote.
 * Idempotent — safe to call on every server start.
 */
export async function seedDemoIfEmpty() {
  const existing = await db
    .select({ id: schema.trips.id })
    .from(schema.trips)
    .where(eq(schema.trips.inviteCode, "DEMO24"))
    .limit(1);
  if (existing.length > 0) return;

  const now = Date.now();
  const tripId = "demo-lisbon";

  await db.insert(schema.trips).values({
    id: tripId,
    name: "Squad city break 🇵🇹",
    inviteCode: "DEMO24",
    adminToken: newAdminToken(),
    budget: "€500–700 each",
    vibes: JSON.stringify(["food", "culture", "chill"]),
    notes: "Direct flights under 3h. Priya is vegetarian, Sami doesn't do hostels.",
    deadline: now + 5 * DAY,
    anonymize: 0,
    createdAt: now,
  });

  const people = [
    { id: "p-marta", name: "Marta", emoji: "🦊", isAdmin: 1 },
    { id: "p-jonas", name: "Jonas", emoji: "🐻", isAdmin: 0 },
    { id: "p-priya", name: "Priya", emoji: "🦚", isAdmin: 0 },
    { id: "p-leo", name: "Leo", emoji: "🐙", isAdmin: 0 },
    { id: "p-sami", name: "Sami", emoji: "🦉", isAdmin: 0 },
  ];
  await db.insert(schema.participants).values(
    people.map((p, i) => ({ ...p, tripId, createdAt: now - (5 - i) * 60_000 })),
  );

  const dateOptions = [
    { id: "do-1", startDate: iso(21), endDate: iso(24) }, // wins
    { id: "do-2", startDate: iso(35), endDate: iso(38) },
    { id: "do-3", startDate: iso(49), endDate: iso(52) },
  ];
  await db.insert(schema.dateOptions).values(
    dateOptions.map((o, i) => ({ ...o, id: o.id, tripId, createdAt: now - 4 * DAY + i })),
  );

  const dateVotes: [string, string, "yes" | "maybe" | "no"][] = [
    ["do-1", "p-marta", "yes"], ["do-1", "p-jonas", "yes"], ["do-1", "p-priya", "yes"], ["do-1", "p-leo", "maybe"], ["do-1", "p-sami", "yes"],
    ["do-2", "p-marta", "no"], ["do-2", "p-jonas", "maybe"], ["do-2", "p-priya", "no"], ["do-2", "p-leo", "yes"],
    ["do-3", "p-marta", "maybe"], ["do-3", "p-jonas", "no"], ["do-3", "p-priya", "yes"],
  ];
  await db.insert(schema.dateVotes).values(
    dateVotes.map(([optionId, participantId, status]) => ({ optionId, participantId, status })),
  );

  const dests = [
    { id: "d-lis", name: "Lisbon", country: "Portugal", blurb: "Tiled streets, pastéis, trams uphill." },
    { id: "d-bcn", name: "Barcelona", country: "Spain", blurb: "Beach mornings, Gaudí everything." },
    { id: "d-opo", name: "Porto", country: "Portugal", blurb: "Port wine + Francesinha challenges." },
  ];
  await db.insert(schema.destinations).values(
    dests.map((d, i) => ({ ...d, tripId, createdAt: now - 4 * DAY + i })),
  );

  const destVotes: [string, string, 2 | 1 | -1][] = [
    ["d-lis", "p-marta", 2], ["d-lis", "p-jonas", 2], ["d-lis", "p-priya", 1], ["d-lis", "p-leo", 2],
    ["d-bcn", "p-marta", 1], ["d-bcn", "p-priya", 2], ["d-bcn", "p-leo", 1], ["d-bcn", "p-sami", 2],
    ["d-opo", "p-marta", 2], ["d-opo", "p-jonas", 1], ["d-opo", "p-sami", -1],
  ];
  await db.insert(schema.destinationVotes).values(
    destVotes.map(([destinationId, participantId, value]) => ({ destinationId, participantId, value })),
  );

  const places = [
    { id: "pl-1", name: "Time Out Market", category: "food", note: "Everyone picks their own stall", addedBy: "p-marta" },
    { id: "pl-2", name: "Miradouro da Senhora do Monte", category: "sight", note: "Best sunset viewpoint", addedBy: "p-leo" },
    { id: "pl-3", name: "Kayaking on the Tagus", category: "activity", note: "Leo swears it's safe", addedBy: "p-leo" },
    { id: "pl-4", name: "Fado night in Alfama", category: "activity", note: "Dinner + show combo", addedBy: "p-priya" },
    { id: "pl-5", name: "Pastéis de Belém", category: "food", note: "Warm, not boxed", addedBy: "p-jonas" },
    { id: "pl-6", name: "Pensão Amor", category: "nightlife", addedBy: "p-sami" },
  ];
  await db.insert(schema.places).values(
    places.map((p, i) => ({ ...p, tripId, createdAt: now - 3 * DAY + i * 3_600_000 })),
  );

  const placeVotes: [string, string][] = [
    ["pl-1", "p-marta"], ["pl-1", "p-jonas"], ["pl-1", "p-sami"],
    ["pl-2", "p-marta"], ["pl-2", "p-priya"],
    ["pl-3", "p-leo"], ["pl-3", "p-sami"],
    ["pl-4", "p-priya"], ["pl-4", "p-marta"], ["pl-4", "p-jonas"],
    ["pl-5", "p-jonas"], ["pl-5", "p-marta"],
    ["pl-6", "p-sami"],
  ];
  await db.insert(schema.placeVotes).values(
    placeVotes.map(([placeId, participantId]) => ({ placeId, participantId })),
  );

  console.log("[seed] demo trip ready — join with code DEMO24");
}

// `npm run db:seed`
if (process.argv[1]?.includes("seed")) {
  seedDemoIfEmpty()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
