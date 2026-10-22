import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { loadTrip } from "@/lib/state";
import { COOKIE_OPTS, participantCookieName } from "@/lib/session";
import { newId } from "@/lib/ids";
import { tripChanged } from "@/lib/events";

const joinSchema = z.object({
  name: z.string().trim().min(1).max(40),
  emoji: z.string().trim().min(1).max(8),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const trip = await loadTrip(id);
  if (!trip) return NextResponse.json({ error: "trip not found" }, { status: 404 });

  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "name + emoji required" }, { status: 400 });

  const participantId = newId("p");
  await db.insert(schema.participants).values({
    id: participantId,
    tripId: id,
    name: parsed.data.name,
    emoji: parsed.data.emoji,
    isAdmin: 0,
    createdAt: Date.now(),
  });

  const jar = await cookies();
  jar.set(participantCookieName(id), participantId, COOKIE_OPTS);

  tripChanged(id);
  return NextResponse.json({ ok: true, participantId });
}
