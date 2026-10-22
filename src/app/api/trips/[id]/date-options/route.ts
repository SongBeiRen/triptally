import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { newId } from "@/lib/ids";
import { tripChanged } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

const addSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { participant } = await getViewer(id);
  if (!participant) return NextResponse.json({ error: "join the trip first" }, { status: 401 });

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.end < parsed.data.start) {
    return NextResponse.json({ error: "valid start/end dates required" }, { status: 400 });
  }

  await db.insert(schema.dateOptions).values({
    id: newId("do"),
    tripId: id,
    label: parsed.data?.label || null,
    startDate: parsed.data.start,
    endDate: parsed.data.end,
    createdAt: Date.now(),
  });

  tripChanged(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { isAdmin } = await getViewer(id);
  if (!isAdmin) return NextResponse.json({ error: "organizer only" }, { status: 403 });

  const optionId = new URL(req.url).searchParams.get("optionId");
  if (!optionId) return NextResponse.json({ error: "optionId required" }, { status: 400 });

  const option = await db.select().from(schema.dateOptions).where(eq(schema.dateOptions.id, optionId)).limit(1);
  if (!option[0] || option[0].tripId !== id) return NextResponse.json({ error: "bad option" }, { status: 400 });

  await db.delete(schema.dateOptions).where(eq(schema.dateOptions.id, optionId));
  tripChanged(id);
  return NextResponse.json({ ok: true });
}
