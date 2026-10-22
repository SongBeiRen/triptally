import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { buildTripState } from "@/lib/state";
import { getViewer } from "@/lib/session";
import { buildFallbackPlan, planDayCount } from "@/lib/planner";
import { generatePlanWithLLM, llmConfigured } from "@/lib/llm";
import { newId } from "@/lib/ids";
import { tripChanged } from "@/lib/events";

/** Generate (or regenerate) the day-by-day plan. LLM when configured, deterministic fallback otherwise. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { participant } = await getViewer(id);
  if (!participant) return NextResponse.json({ error: "join the trip first" }, { status: 401 });

  const state = await buildTripState(id);
  if (!state) return NextResponse.json({ error: "trip not found" }, { status: 404 });
  if (state.destinations.length === 0) {
    return NextResponse.json({ error: "add at least one destination first" }, { status: 400 });
  }

  const days = planDayCount(state);
  const attempts = state.plan ? 2 : 1; // regenerate varies the fallback seed
  let plan = llmConfigured() ? await generatePlanWithLLM(state, days) : null;
  const generatedBy = plan ? "ai" : "fallback";
  if (!plan) plan = buildFallbackPlan(state, days, attempts);

  await db.insert(schema.itineraries).values({
    id: newId("it"),
    tripId: id,
    generatedBy,
    destination: plan.destination,
    payload: JSON.stringify(plan),
    createdAt: Date.now(),
  });

  tripChanged(id);
  return NextResponse.json({ ok: true, plan, generatedBy });
}
