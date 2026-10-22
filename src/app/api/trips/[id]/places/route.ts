import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { newId } from "@/lib/ids";
import { PLACE_CATEGORIES } from "@/lib/types";
import { tripChanged } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

const addSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(PLACE_CATEGORIES),
  note: z.string().trim().max(140).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { participant } = await getViewer(id);
  if (!participant) return NextResponse.json({ error: "join the trip first" }, { status: 401 });

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid place" }, { status: 400 });

  await db.insert(schema.places).values({
    id: newId("pl"),
    tripId: id,
    name: parsed.data.name,
    category: parsed.data.category,
    note: parsed.data.note || null,
    addedBy: participant.id,
    createdAt: Date.now(),
  });

  tripChanged(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { participant, isAdmin } = await getViewer(id);
  if (!participant) return NextResponse.json({ error: "join the trip first" }, { status: 401 });

  const placeId = new URL(req.url).searchParams.get("placeId");
  if (!placeId) return NextResponse.json({ error: "placeId required" }, { status: 400 });

  const place = await db.select().from(schema.places).where(eq(schema.places.id, placeId)).limit(1);
  if (!place[0] || place[0].tripId !== id) return NextResponse.json({ error: "bad place" }, { status: 400 });
  if (!isAdmin && place[0].addedBy !== participant.id) {
    return NextResponse.json({ error: "only the organizer or whoever added it can remove it" }, { status: 403 });
  }

  await db.delete(schema.places).where(eq(schema.places.id, placeId));
  tripChanged(id);
  return NextResponse.json({ ok: true });
}
