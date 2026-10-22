import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { tripChanged } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

const voteSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("date"),
    optionId: z.string().min(1),
    status: z.enum(["yes", "maybe", "no", "clear"]),
  }),
  z.object({
    kind: z.literal("destination"),
    destinationId: z.string().min(1),
    value: z.union([z.literal(2), z.literal(1), z.literal(-1), z.literal(0)]), // 0 = clear vote
  }),
  z.object({
    kind: z.literal("place"),
    placeId: z.string().min(1), // toggles the upvote
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { participant } = await getViewer(id);
  if (!participant) return NextResponse.json({ error: "join the trip first" }, { status: 401 });

  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid vote" }, { status: 400 });
  const vote = parsed.data;

  if (vote.kind === "date") {
    const option = await db
      .select()
      .from(schema.dateOptions)
      .where(eq(schema.dateOptions.id, vote.optionId))
      .limit(1);
    if (!option[0] || option[0].tripId !== id) return NextResponse.json({ error: "bad option" }, { status: 400 });

    if (vote.status === "clear") {
      await db
        .delete(schema.dateVotes)
        .where(and(eq(schema.dateVotes.optionId, vote.optionId), eq(schema.dateVotes.participantId, participant.id)));
    } else {
      await db
        .insert(schema.dateVotes)
        .values({ optionId: vote.optionId, participantId: participant.id, status: vote.status })
        .onConflictDoUpdate({
          target: [schema.dateVotes.optionId, schema.dateVotes.participantId],
          set: { status: vote.status },
        });
    }
  } else if (vote.kind === "destination") {
    const dest = await db
      .select()
      .from(schema.destinations)
      .where(eq(schema.destinations.id, vote.destinationId))
      .limit(1);
    if (!dest[0] || dest[0].tripId !== id) return NextResponse.json({ error: "bad destination" }, { status: 400 });

    if (vote.value === 0) {
      await db
        .delete(schema.destinationVotes)
        .where(
          and(eq(schema.destinationVotes.destinationId, vote.destinationId), eq(schema.destinationVotes.participantId, participant.id)),
        );
    } else {
      await db
        .insert(schema.destinationVotes)
        .values({ destinationId: vote.destinationId, participantId: participant.id, value: vote.value })
        .onConflictDoUpdate({
          target: [schema.destinationVotes.destinationId, schema.destinationVotes.participantId],
          set: { value: vote.value },
        });
    }
  } else {
    const place = await db.select().from(schema.places).where(eq(schema.places.id, vote.placeId)).limit(1);
    if (!place[0] || place[0].tripId !== id) return NextResponse.json({ error: "bad place" }, { status: 400 });

    const existing = await db
      .select()
      .from(schema.placeVotes)
      .where(and(eq(schema.placeVotes.placeId, vote.placeId), eq(schema.placeVotes.participantId, participant.id)))
      .limit(1);
    if (existing.length > 0) {
      await db
        .delete(schema.placeVotes)
        .where(and(eq(schema.placeVotes.placeId, vote.placeId), eq(schema.placeVotes.participantId, participant.id)));
    } else {
      await db.insert(schema.placeVotes).values({ placeId: vote.placeId, participantId: participant.id });
    }
  }

  tripChanged(id);
  return NextResponse.json({ ok: true });
}
