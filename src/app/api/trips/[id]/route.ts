import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { buildTripState } from "@/lib/state";
import { getViewer } from "@/lib/session";
import { tripChanged } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const state = await buildTripState(id);
  if (!state) return NextResponse.json({ error: "trip not found" }, { status: 404 });
  return NextResponse.json(state);
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  budget: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  vibes: z.array(z.string().trim().min(1).max(24)).max(6).optional(),
  anonymize: z.boolean().optional(),
  deadline: z.number().int().positive().nullable().optional(), // epoch ms
  deadlineDays: z.number().int().min(1).max(60).nullable().optional(), // server computes the epoch
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { isAdmin } = await getViewer(id);
  if (!isAdmin) return NextResponse.json({ error: "organizer only" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid patch" }, { status: 400 });

  const updates: Partial<typeof schema.trips.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.budget !== undefined) updates.budget = parsed.data.budget || null;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes || null;
  if (parsed.data.vibes !== undefined) updates.vibes = JSON.stringify(parsed.data.vibes);
  if (parsed.data.anonymize !== undefined) updates.anonymize = parsed.data.anonymize ? 1 : 0;
  if (parsed.data.deadline !== undefined) updates.deadline = parsed.data.deadline;
  if (parsed.data.deadlineDays !== undefined) {
    updates.deadline = parsed.data.deadlineDays ? Date.now() + parsed.data.deadlineDays * 86_400_000 : null;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(schema.trips).set(updates).where(eq(schema.trips.id, id));
    tripChanged(id);
  }
  return NextResponse.json({ ok: true });
}
