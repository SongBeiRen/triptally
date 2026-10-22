"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDateRange } from "@/lib/decision";
import { ITEM_KIND_META } from "@/lib/types";
import { RoomProps, SectionTitle } from "./bits";

const SLOTS = [
  { key: "morning", label: "Morning", emoji: "🌤️" },
  { key: "afternoon", label: "Afternoon", emoji: "☀️" },
  { key: "evening", label: "Evening", emoji: "🌙" },
] as const;

export default function PlanTab({
  state,
  post,
  toast,
  llmOn,
  onGenerated,
}: RoomProps & { llmOn: boolean; onGenerated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const bestDate = state.dateOptions.find((o) => o.id === state.decision.bestDateOptionId);
  const winner = state.destinations.find((d) => d.id === state.decision.winnerDestinationId);

  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      await post("/plan");
      await onGenerated();
    } catch {
      /* error toast already surfaced by the request helper */
    } finally {
      setBusy(false);
    }
  }

  function copyPlan() {
    if (!state.plan) return;
    const lines: string[] = [
      `🧭 ${state.plan.destination} — ${state.trip.name}`,
      state.plan.summary,
      "",
    ];
    for (const day of state.plan.days) {
      lines.push(`Day ${day.day} — ${day.title}`);
      for (const slot of SLOTS) {
        const items = day[slot.key];
        if (items.length === 0) continue;
        lines.push(`  ${slot.label}:`);
        for (const item of items) lines.push(`    ${item.time}  ${item.title}${item.note ? ` (${item.note})` : ""}`);
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => toast("Plan copied — paste it in the chat 📋"),
      () => toast("Couldn't copy"),
    );
  }

  return (
    <div>
      <SectionTitle hint="Built from the winning destination, the best window and your shortlist.">The plan</SectionTitle>

      {!state.plan && !busy && (
        <div className="card p-8 text-center max-w-xl mx-auto">
          <div className="text-4xl" aria-hidden>🗺️</div>
          <h3 className="font-display text-xl font-semibold mt-3">
            {winner ? `${winner.name} it is — let's fill the days.` : "Turn the votes into a day-by-day plan"}
          </h3>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            {winner
              ? bestDate
                ? `Planning ${winner.name}, ${formatDateRange(bestDate.startDate, bestDate.endDate)}, using your group's shortlist.`
                : `Planning ${winner.name} around your group's shortlist.`
              : "No destination votes yet — we'll plan for whoever's leading once you generate."}
          </p>
          <button className="btn btn-primary px-8 py-3.5 mt-6" onClick={generate}>
            Generate the plan ✨
          </button>
          <p className="text-[11px] text-ink-soft mt-3">
            {llmOn ? "Powered by your configured LLM ✨" : "Offline smart planner — add an LLM_API_KEY for AI-generated plans"}
          </p>
        </div>
      )}

      {busy && (
        <div className="space-y-3 max-w-xl mx-auto">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 w-32 bg-line rounded" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full bg-line rounded" />
                <div className="h-3 w-4/5 bg-line rounded" />
                <div className="h-3 w-2/3 bg-line rounded" />
              </div>
            </div>
          ))}
          <p className="text-center text-sm text-ink-soft pulse-soft">
            {llmOn ? "The AI is asking around…" : "Laying out the days…"}
          </p>
        </div>
      )}

      <AnimatePresence>
        {state.plan && !busy && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="card p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-xl font-semibold">
                    {state.plan.destination} · {state.plan.days.length} day{state.plan.days.length > 1 ? "s" : ""}
                  </h3>
                  <span className={`chip !py-0.5 !px-2 !text-[11px] !cursor-default ${state.planGeneratedBy === "ai" ? "!bg-coral-soft !border-coral !text-coral-deep" : "!bg-teal-soft !border-teal !text-teal-deep"}`}>
                    {state.planGeneratedBy === "ai" ? "✨ AI-generated" : "🧭 offline planner"}
                  </span>
                </div>
                <p className="text-sm text-ink-soft mt-1">{state.plan.summary}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn btn-ghost px-4 py-2 text-sm" onClick={copyPlan}>
                  📋 Copy for the chat
                </button>
                <button className="btn btn-teal px-4 py-2 text-sm" onClick={generate}>
                  ↻ Regenerate
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {state.plan.days.map((day) => (
                <motion.div key={day.day} layout className="card p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl text-line select-none" aria-hidden>
                      {String(day.day).padStart(2, "0")}
                    </span>
                    <h4 className="font-display text-lg font-semibold leading-tight">{day.title}</h4>
                  </div>
                  <div className="mt-4 space-y-4">
                    {SLOTS.map((slot) => {
                      const items = day[slot.key];
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={slot.key}>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                            {slot.emoji} {slot.label}
                          </p>
                          <ul className="mt-1.5 space-y-2">
                            {items.map((item, i) => (
                              <li key={i} className="flex gap-2.5 items-start">
                                <span className="text-[11px] font-mono bg-gold-soft text-ink rounded-md px-1.5 py-0.5 mt-0.5 shrink-0 tabular-nums">
                                  {item.time}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-snug">
                                    <span className="mr-1" aria-hidden>{ITEM_KIND_META[item.kind]}</span>
                                    {item.title}
                                    {item.place && <span className="text-gold ml-1" title="from your shortlist">⭐</span>}
                                  </p>
                                  {item.note && <p className="text-xs text-ink-soft leading-snug mt-0.5">{item.note}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
