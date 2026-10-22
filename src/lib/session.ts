import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

/**
 * Identity is per-trip and cookie-based — no accounts anywhere.
 *  - tt_p_<tripId> = participant id (set when creating/joining)
 *  - tt_a_<tripId> = admin token   (set via the organizer-only link)
 */

export function participantCookieName(tripId: string) {
  return `tt_p_${tripId}`;
}

export function adminCookieName(tripId: string) {
  return `tt_a_${tripId}`;
}

export async function getViewer(tripId: string): Promise<{
  participant: typeof schema.participants.$inferSelect | null;
  isAdmin: boolean;
}> {
  const jar = await cookies();
  const pid = jar.get(participantCookieName(tripId))?.value;
  const adminToken = jar.get(adminCookieName(tripId))?.value;

  let participant: typeof schema.participants.$inferSelect | null = null;
  if (pid) {
    const rows = await db
      .select()
      .from(schema.participants)
      .where(eq(schema.participants.id, pid))
      .limit(1);
    if (rows[0]?.tripId === tripId) participant = rows[0];
  }

  let isAdmin = participant?.isAdmin === 1;
  if (!isAdmin && adminToken) {
    const tripRows = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId)).limit(1);
    isAdmin = tripRows[0]?.adminToken === adminToken;
  }

  return { participant, isAdmin };
}

export const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
