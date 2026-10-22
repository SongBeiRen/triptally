import { formatDateRange } from "./decision";
import { itinerarySchema, type Itinerary, type TripState } from "./types";

/**
 * LLM integration via any OpenAI-compatible /chat/completions endpoint.
 * Configure in .env.local:
 *   LLM_API_KEY=...            (required to enable AI planning)
 *   LLM_BASE_URL=https://...   (default: https://api.openai.com/v1)
 *   LLM_MODEL=gpt-4o-mini      (default)
 * Any failure (no key, network, bad JSON) returns null and the caller falls
 * back to the deterministic planner — the demo never breaks.
 */

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
}

export async function generatePlanWithLLM(state: TripState, days: number): Promise<Itinerary | null> {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  const winner =
    state.destinations.find((d) => d.id === state.decision.winnerDestinationId) ?? state.destinations[0];
  if (!winner) return null;

  const dateRange = state.dateOptions.find((o) => o.id === state.decision.bestDateOptionId);
  const shortlist = [...state.places]
    .sort((a, b) => b.voterIds.length - a.voterIds.length)
    .slice(0, 10)
    .map((p) => `- ${p.name} (${p.category}${p.note ? `, note: ${p.note}` : ""}) — ${p.voterIds.length} votes`);

  const userPrompt = [
    `Trip: ${state.trip.name}`,
    `Destination the group voted for: ${winner.name}${winner.country ? `, ${winner.country}` : ""}`,
    dateRange ? `Dates: ${formatDateRange(dateRange.startDate, dateRange.endDate)} (${days} days)` : `Length: ${days} days`,
    state.trip.budget ? `Budget: ${state.trip.budget}` : null,
    state.trip.vibes.length ? `Vibes: ${state.trip.vibes.join(", ")}` : null,
    state.trip.notes ? `Extra requirements from the group: ${state.trip.notes}` : null,
    `Group size: ${state.participants.length} friends`,
    shortlist.length ? `Places the group shortlisted (use these where they fit):\n${shortlist.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are a tight group-travel planner. Produce a ${days}-day itinerary for friends (not a honeymoon, keep it fun, social and practical).
Rules:
- Each day has exactly morning/afternoon/evening arrays with 1-2 items each.
- Work in the group's shortlisted places where they fit naturally.
- Real, well-known venues and areas; include concrete times (HH:MM).
- kind must be one of: food, drink, sight, activity, nightlife, travel, stay.
- day 1 must include arrival logistics; the last day a farewell dinner or departure.
- Keep titles short and specific. Notes max ~12 words.
Respond ONLY with JSON matching exactly:
{"destination": string, "summary": string (one sentence), "days": [{"day": number, "title": string, "morning": [{"time": string, "title": string, "kind": string, "note"?: string}], "afternoon": [...], "evening": [...]}]}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[llm] ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = itinerarySchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      console.error("[llm] schema mismatch:", parsed.error.issues.slice(0, 3));
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.error("[llm] planning failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
