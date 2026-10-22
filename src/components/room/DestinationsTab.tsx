"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DestinationVoteValue } from "@/lib/types";
import { AvatarStack, EmptyState, gradientFor, RoomProps, SectionTitle } from "./bits";

const CITY_EMOJIS = ["🏙️", "🏰", "🏝️", "🏔️", "🌉", "🏖️", "🎡", "🌋"];

function cityEmoji(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CITY_EMOJIS[h % CITY_EMOJIS.length];
}

const VOTE_OPTIONS: { value: DestinationVoteValue; emoji: string; label: string; activeCls: string }[] = [
  { value: 2, emoji: "❤️", label: "love it", activeCls: "!border-coral !bg-coral-soft" },
  { value: 1, emoji: "👍", label: "into it", activeCls: "!border-teal !bg-teal-soft" },
  { value: -1, emoji: "👎", label: "hard pass", activeCls: "!border-[#d9534f] !bg-[#fbe9e8]" },
];

export default function DestinationsTab({ state, post, del, voteDestination, toast }: RoomProps) {
  const meId = state.me?.id ?? "";
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const sorted = [...state.destinations].sort((a, b) => b.tally.score - a.tally.score || b.tally.love - a.tally.love);

  async function add() {
    if (!name.trim()) {
      toast("Give the city a name");
      return;
    }
    await post("/destinations", { name: name.trim(), country: country.trim() });
    setName("");
    setCountry("");
    setAdding(false);
  }

  if (state.destinations.length === 0 && !adding) {
    return (
      <div className="space-y-4">
        <SectionTitle hint={state.decision.locked ? "Decision locked — the tally has spoken." : "Love it / into it / hard pass. The tally does the arguing."}>
          Where to?
        </SectionTitle>
        <EmptyState emoji="🌍" title="No candidates yet" text="Add 2–3 destination ideas and let the group vote. Anonymous voting is on if the organizer enabled it." />
        <div className="text-center">
          <button className="btn btn-primary px-6 py-3" onClick={() => setAdding(true)}>
            + Suggest a destination
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle hint={state.decision.locked ? "Decision locked — highest tally wins. 🏆" : "Love it / into it / hard pass. The tally does the arguing."}>
        Where to?
      </SectionTitle>

      <div className="grid sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {sorted.map((d) => {
            const isWinner = d.id === state.decision.winnerDestinationId;
            const myVote = d.votes[meId];
            const voters = (value: DestinationVoteValue) =>
              state.participants.filter((p) => d.votes[p.id] === value);
            const totalVoters = Object.keys(d.votes).filter((pid) => state.participants.some((p) => p.id === pid)).length;

            return (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={`card overflow-hidden relative ${isWinner && state.decision.locked ? "ring-2 ring-gold" : isWinner ? "ring-1 ring-ink/20" : ""}`}
              >
                {state.isAdmin && (
                  <button
                    onClick={() => del(`/destinations?destId=${d.id}`)}
                    className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/25 text-white text-xs hover:bg-black/45 transition-colors"
                    aria-label={`remove ${d.name}`}
                    title="remove (organizer)"
                  >
                    ✕
                  </button>
                )}

                <div className={`h-20 bg-gradient-to-br ${gradientFor(d.name)} flex items-center justify-between px-5`}>
                  <span className="text-3xl drop-shadow-sm" aria-hidden>{cityEmoji(d.name)}</span>
                  {isWinner && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-bold bg-white/90 rounded-full px-2.5 py-1"
                    >
                      {state.decision.locked ? "🏆 WINNER" : "👑 leading"}
                    </motion.span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display text-xl font-semibold">{d.name}</h3>
                    {d.country && <span className="text-xs text-ink-soft">{d.country}</span>}
                  </div>
                  {d.blurb && <p className="text-sm text-ink-soft mt-1">{d.blurb}</p>}

                  {/* tallies */}
                  <div className="mt-3 space-y-1.5">
                    {VOTE_OPTIONS.map((opt) => {
                      const count = opt.value === 2 ? d.tally.love : opt.value === 1 ? d.tally.like : d.tally.nope;
                      const width = totalVoters > 0 ? `${(count / totalVoters) * 100}%` : "0%";
                      return (
                        <div key={opt.value} className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs">{opt.emoji}</span>
                          <div className="flex-1 h-2 rounded-full bg-background border border-line overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${opt.value === 2 ? "bg-coral" : opt.value === 1 ? "bg-teal" : "bg-[#d9534f]"}`}
                              animate={{ width }}
                              transition={{ type: "spring", stiffness: 200, damping: 26 }}
                            />
                          </div>
                          <span className="text-xs text-ink-soft w-4 text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* who voted what (unless anonymous) */}
                  {!state.trip.anonymize && totalVoters > 0 && (
                    <div className="mt-3 space-y-1">
                      {VOTE_OPTIONS.map((opt) => {
                        const who = voters(opt.value);
                        if (who.length === 0) return null;
                        return (
                          <div key={opt.value} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                            <span>{opt.emoji}</span>
                            <AvatarStack people={who} max={6} />
                            <span>{who.map((p) => p.name).slice(0, 3).join(", ")}{who.length > 3 ? "…" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* my vote */}
                  <div className="mt-4 flex gap-1.5">
                    {VOTE_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.95 }}
                        disabled={state.decision.locked}
                        title={state.decision.locked ? "decision is locked" : opt.label}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 ${
                          myVote === opt.value ? opt.activeCls : "border-line bg-surface hover:bg-gold-soft"
                        }`}
                        onClick={() => voteDestination(d.id, myVote === opt.value ? 0 : opt.value)}
                      >
                        {opt.emoji}
                      </motion.button>
                    ))}
                  </div>
                  {myVote !== undefined && !state.decision.locked && (
                    <button
                      className="mt-1.5 text-[11px] text-ink-soft hover:text-coral-deep"
                      onClick={() => voteDestination(d.id, 0)}
                    >
                      clear my vote
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* add card */}
        {adding ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
            <input className="field" placeholder="City" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={60} />
            <input className="field mt-2" placeholder="Country (optional)" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={40} />
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary px-4 py-2 text-sm" onClick={add}>
                Add
              </button>
              <button className="btn btn-ghost px-4 py-2 text-sm" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-[1.25rem] border-2 border-dashed border-line hover:border-coral hover:text-coral transition-colors min-h-40 flex flex-col items-center justify-center gap-2 text-ink-soft font-medium"
          >
            <span className="text-2xl" aria-hidden>➕</span>
            Suggest a destination
          </button>
        )}
      </div>

      {state.decision.locked && (
        <p className="mt-4 text-center text-sm text-ink-soft">
          🔒 Voting locked. The plan tab builds around the winner.
        </p>
      )}
    </div>
  );
}
