"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORY_META, PLACE_CATEGORIES, type PlaceCategory } from "@/lib/types";
import { Avatar, AvatarStack, EmptyState, RoomProps, SectionTitle } from "./bits";

export default function PlacesTab({ state, post, del, votePlace, toast }: RoomProps) {
  const meId = state.me?.id ?? "";
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("food");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  const ranked = [...state.places].sort(
    (a, b) => b.voterIds.length - a.voterIds.length || a.name.localeCompare(b.name),
  );

  async function add() {
    if (!name.trim()) {
      toast("What's the place called?");
      return;
    }
    await post("/places", { name: name.trim(), category, note: note.trim() });
    setName("");
    setNote("");
    setCategory("food");
    setExpanded(false);
  }

  const canDelete = (addedBy: string | null) => state.isAdmin || addedBy === meId;

  return (
    <div>
      <SectionTitle hint="That taco place, that viewpoint, that bar someone swears by — throw them all in. Most votes make the plan.">
        Places shortlist
      </SectionTitle>

      {/* add form */}
      {expanded ? (
        <div className="card p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="field"
              placeholder="Name — e.g. Time Out Market"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={80}
            />
            <div className="flex flex-wrap gap-1.5 sm:items-center">
              {PLACE_CATEGORIES.map((c) => (
                <button key={c} className={`chip ${category === c ? "chip-on" : ""}`} onClick={() => setCategory(c)}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              className="field"
              placeholder="Why it's worth it (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
            />
            <div className="flex gap-2 shrink-0">
              <button className="btn btn-primary px-5 py-2.5 text-sm" onClick={add}>
                Add to shortlist
              </button>
              <button className="btn btn-ghost px-4 py-2.5 text-sm" onClick={() => setExpanded(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="chip !px-4 !py-2 mb-5 !border-dashed hover:!border-coral hover:!text-coral"
          onClick={() => setExpanded(true)}
        >
          ➕ Add a place to the shortlist
        </button>
      )}

      {state.places.length === 0 ? (
        <EmptyState
          emoji="📍"
          title="Nothing shortlisted yet"
          text="Every place anyone mentions gets one home here — with votes, so the quiet suggestions still count."
        />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          <AnimatePresence initial={false}>
            {ranked.map((p, i) => {
              const mine = p.voterIds.includes(meId);
              const voters = state.participants.filter((x) => p.voterIds.includes(x.id));
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={`w-7 text-center font-display font-semibold ${i === 0 && p.voterIds.length > 0 ? "text-gold" : "text-ink-soft"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xl shrink-0" aria-hidden>{CATEGORY_META[p.category]?.emoji ?? "📍"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{p.name}</span>
                      <span className="text-[11px] text-ink-soft">{CATEGORY_META[p.category]?.label}</span>
                    </div>
                    <div className="text-xs text-ink-soft truncate">
                      {p.note && <span className="italic">{p.note}</span>}
                      {p.note && p.addedBy && " · "}
                      {p.addedBy && (
                        <span className="inline-flex items-center gap-1">
                          by <Avatar p={p.addedBy} size="sm" /> {p.addedBy.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {!state.trip.anonymize && voters.length > 0 && (
                    <div className="hidden sm:block shrink-0">
                      <AvatarStack people={voters} max={4} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {canDelete(p.addedBy?.id ?? null) && (
                      <button
                        className="text-ink-soft hover:text-coral-deep text-sm w-6 h-6"
                        onClick={() => del(`/places?placeId=${p.id}`)}
                        aria-label={`remove ${p.name}`}
                        title="remove"
                      >
                        ✕
                      </button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className={`btn px-3.5 py-2 text-sm ${mine ? "btn-teal" : "btn-ghost"}`}
                      onClick={() => votePlace(p.id)}
                      title={mine ? "remove your upvote" : "upvote"}
                    >
                      ▲ {p.voterIds.length}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {state.places.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft text-center">
          Top shortlisted spots get woven into the generated plan ⭐
        </p>
      )}
    </div>
  );
}
