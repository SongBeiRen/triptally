import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { newAdminToken, newId, newInviteCode } from "@/lib/ids";
import { adminCookieName, COOKIE_OPTS, participantCookieName } from "@/lib/session";
import { tripChanged } from "@/lib/events";

const createSchema = z.object({
  tripName: z.string().trim().min(2).max(80),
  yourName: z.string().trim().min(1).max(40),
  emoji: z.string().trim().min(1).max(8),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  vibes: z.array(z.string().trim().min(1).max(24)).max(6).default([]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  anonymize: z.boolean().default(false),
  deadlineDays: z.number().int().min(1).max(60).nullable().default(null),
  destinations: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        country: z.string().trim().max(40).optional(),
        blurb: z.string().trim().max(120).optional(),
      }),
    )
    .min(1)
    .max(8),
  dateOptions: z
    .array(z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .min(1)
    .max(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid trip", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  const now = Date.now();
  const tripId = newId("t");
  const inviteCode = newInviteCode();
  const adminToken = newAdminToken();
  const organizerId = newId("p");

  await db.insert(schema.trips).values({
    id: tripId,
    name: input.tripName,
    inviteCode,
    adminToken,
    budget: input.budget || null,
    vibes: JSON.stringify(input.vibes),
    notes: input.notes || null,
    deadline: input.deadlineDays ? now + input.deadlineDays * 86_400_000 : null,
    anonymize: input.anonymize ? 1 : 0,
    createdAt: now,
  });

  await db.insert(schema.participants).values({
    id: organizerId,
    tripId,
    name: input.yourName,
    emoji: input.emoji,
    isAdmin: 1,
    createdAt: now,
  });

  await db.insert(schema.destinations).values(
    input.destinations.map((d, i) => ({
      id: newId("d"),
      tripId,
      name: d.name,
      country: d.country || null,
      blurb: d.blurb || null,
      createdAt: now + i,
    })),
  );

  await db.insert(schema.dateOptions).values(
    input.dateOptions.map((o, i) => ({
      id: newId("do"),
      tripId,
      label: null,
      startDate: o.start,
      endDate: o.end,
      createdAt: now + i,
    })),
  );

  const jar = await cookies();
  jar.set(participantCookieName(tripId), organizerId, COOKIE_OPTS);
  jar.set(adminCookieName(tripId), adminToken, COOKIE_OPTS);

  tripChanged(tripId);
  return NextResponse.json({ ok: true, tripId, inviteCode });
}
