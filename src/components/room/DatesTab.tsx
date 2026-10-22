"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { dateScore, formatDateRange, nightsBetween } from "@/lib/decision";
import type { DateVoteStatus } from "@/lib/types";
import { Avatar, EmptyState, RoomProps, SectionTitle } from "./bits";

const STATUS_STYLE: Record<Exclude<DateVoteStatus, never> | "none", { label: string; cls: string }> = {
  yes: { label: "✓", cls: "bg-teal text-white border-teal" },
  maybe: { label: "〜", cls: "bg-gold text-white border-gold" },
  no: { label: "✕", cls: "bg-[#d9534f] text-white border-[#d9534f]" },
  none: { label: "", cls: "bg-surface border-line border-dashed" },
};

export default function DatesTab({ state, post, del, voteDate, toast }: RoomProps) {
  const meId = state.me?.id ?? "";
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const best = state.dateOptions.find((o) => o.id === state.decision.bestDateOptionId);
  const maxScore = Math.max(1, ...state.dateOptions.map((o) => dateScore(o.tally)));

  async function addWindow() {
    if (!start || !end || end < start) {
      toast("Pick a start and end date");
      return;
    }
    await post("/date-options", { start, end });
    setAdding(false);
    setStart("");
    setEnd("");
  }

  if (state.dateOptions.length === 0 && !adding) {
    return (
      <div className="space-y-4">
        <SectionTitle hint="A few windows, one clear winner.">When can everyone go?</SectionTitle>
        <EmptyState emoji="📅" title="No date windows yet" text="Add the windows that could work — friends mark themselves yes / maybe / no for each one." />
        <div className="text-center">
          <button className="btn btn-primary px-6 py-3" onClick={() => setAdding(true)}>
            + Add a window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle hint="Tap cells in your row: ✓ yes → 〜 maybe → ✕ no → clear. Dates stay open even after the destination locks.">
        When can everyone go?
      </SectionTitle>

      <div className="card overflow-x-auto p-1">
        <table className="w-full border-separate border-spacing-1 min-w-[560px]">
          <thead>
            <tr>
              <th className="w-36" />
              {state.dateOptions.map((o) => {
                const isBest = o.id === state.decision.bestDateOptionId && o.tally.yes + o.tally.maybe > 0;
                return (
                  <th key={o.id} className="px-2 pb-1">
                    <div className={`text-xs font-semibold rounded-xl px-2 py-1.5 leading-tight ${isBest ? "bg-gold-soft ring-1 ring-gold" : ""}`}>
                      <div className="whitespace-nowrap">
                        {isBest && "🏆 "}
                        {formatDateRange(o.startDate, o.endDate)}
                      </div>
                      <div className="text-[11px] font-normal text-ink-soft">
                        {nightsBetween(o.startDate, o.endDate)} day{nightsBetween(o.startDate, o.endDate) > 1 ? "s" : ""}
                        {state.isAdmin && (
                          <>
                            {" · "}
                            <button
                              className="text-coral-deep hover:underline"
                              onClick={() => del(`/date-options?optionId=${o.id}`)}
                            >
                              remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {state.participants.map((p) => {
              const isMe = p.id === meId;
              return (
                <tr key={p.id}>
                  <td className="pr-2">
                    <div className="flex items-center gap-2">
                      <Avatar p={p} me={isMe} size="sm" />
                      <span className="text-sm truncate max-w-24">{p.name}</span>
                    </div>
                  </td>
                  {state.dateOptions.map((o) => {
                    const status = (o.votes[p.id] ?? "none") as keyof typeof STATUS_STYLE;
                    const style = STATUS_STYLE[status];
                    if (!isMe) {
                      return (
                        <td key={o.id}>
                          <div className={`h-10 rounded-xl border flex items-center justify-center text-sm ${style.cls}`}>
                            {style.label}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={o.id}>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          title={`your availability: ${status === "none" ? "unset" : status}`}
                          className={`h-10 w-full rounded-xl border flex items-center justify-center text-sm font-semibold ${style.cls} hover:opacity-80`}
                          onClick={() => {
                            const next: Record<string, "yes" | "maybe" | "no" | "clear"> = {
                              none: "yes",
                              yes: "maybe",
                              maybe: "no",
                              no: "clear",
                            };
                            voteDate(o.id, next[status]);
                          }}
                        >
                          {style.label || "+"}
                        </motion.button>
                      </td>
                    );
                  })}
                  <td />
                </tr>
              );
            })}

            {/* overlap heatmap row */}
            <tr>
              <td className="pr-2 text-xs font-semibold text-ink-soft pt-2">Overlap</td>
              {state.dateOptions.map((o) => {
                const score = dateScore(o.tally);
                const intensity = Math.max(0.08, score / maxScore);
                const isBest = o.id === state.decision.bestDateOptionId && score > 0;
                return (
                  <td key={o.id} className="pt-2">
                    <div
                      className={`h-10 rounded-xl flex flex-col items-center justify-center text-[11px] font-semibold leading-none ${
                        isBest ? "ring-2 ring-gold" : ""
                      }`}
                      style={{ backgroundColor: `rgba(15, 163, 163, ${intensity.toFixed(2)})`, color: intensity > 0.45 ? "#fff" : "var(--ink)" }}
                    >
                      <span>{o.tally.yes}/{state.participants.length} free</span>
                      <span className="font-normal opacity-80">
                        {o.tally.maybe > 0 ? `${o.tally.maybe} maybe` : o.tally.no > 0 ? `${o.tally.no} out` : "clean"}
                      </span>
                    </div>
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {best && best.tally.yes + best.tally.maybe > 0 && (
        <p className="mt-3 text-sm text-ink-soft text-center">
          Best window for the group:{" "}
          <span className="font-semibold text-ink">{formatDateRange(best.startDate, best.endDate)}</span>{" "}
          — {best.tally.yes} yes{best.tally.maybe > 0 ? `, ${best.tally.maybe} maybe` : ""}
          {best.tally.no > 0 ? `, ${best.tally.no} can't make it` : ""}.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {adding ? (
          <div className="card p-3 flex flex-wrap items-center gap-2 w-full">
            <input type="date" className="field !w-40" value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="text-ink-soft">→</span>
            <input type="date" className="field !w-40" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            <button className="btn btn-primary px-4 py-2 text-sm" onClick={addWindow}>
              Add
            </button>
            <button className="btn btn-ghost px-4 py-2 text-sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="chip" onClick={() => setAdding(true)}>
            + add another window
          </button>
        )}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-ink-soft">
          <Legend cls={STATUS_STYLE.yes.cls} label="free" />
          <Legend cls={STATUS_STYLE.maybe.cls} label="maybe" />
          <Legend cls={STATUS_STYLE.no.cls} label="out" />
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-4 h-4 rounded-md border inline-flex items-center justify-center text-[10px] ${cls}`} />
      {label}
    </span>
  );
}
