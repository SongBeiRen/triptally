import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { newId } from "@/lib/ids";
import { tripChanged } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

const addSchema = z.object({
  name: z.string().trim().min(1).max(60),
  country: z.string().trim().max(40).optional(),
  blurb: z.string().trim().max(120).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { participant } = await getViewer(id);
  if (!participant) return NextResponse.json({ error: "join the trip first" }, { status: 401 });

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "name required" }, { status: 400 });

  await db.insert(schema.destinations).values({
    id: newId("d"),
    tripId: id,
    name: parsed.data.name,
    country: parsed.data.country || null,
    blurb: parsed.data.blurb || null,
    createdAt: Date.now(),
  });

  tripChanged(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { isAdmin } = await getViewer(id);
  if (!isAdmin) return NextResponse.json({ error: "organizer only" }, { status: 403 });

  const destId = new URL(req.url).searchParams.get("destId");
  if (!destId) return NextResponse.json({ error: "destId required" }, { status: 400 });

  const dest = await db.select().from(schema.destinations).where(eq(schema.destinations.id, destId)).limit(1);
  if (!dest[0] || dest[0].tripId !== id) return NextResponse.json({ error: "bad destination" }, { status: 400 });

  await db.delete(schema.destinations).where(eq(schema.destinations.id, destId));
  tripChanged(id);
  return NextResponse.json({ ok: true });
}
