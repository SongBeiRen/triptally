import { notFound, redirect } from "next/navigation";
import { buildTripState } from "@/lib/state";
import { llmConfigured } from "@/lib/llm";
import TripRoom from "@/components/room/TripRoom";

export const instant = false; // per-request DB read + cookies — this route is intentionally blocking

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await buildTripState(id);
  if (!state) notFound();
  if (!state.me) redirect(`/join/${state.trip.inviteCode}`);

  return <TripRoom initial={state} llmOn={llmConfigured()} />;
}
