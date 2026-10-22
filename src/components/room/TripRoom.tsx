"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { computeDecision, dateOptionTally, destinationTally, formatDateRange } from "@/lib/decision";
import type { TripState } from "@/lib/types";
import { Avatar, Countdown } from "./bits";
import DatesTab from "./DatesTab";
import DestinationsTab from "./DestinationsTab";
import PlacesTab from "./PlacesTab";
import PlanTab from "./PlanTab";
import type { RoomProps } from "./bits";

type Tab = "dates" | "destinations" | "places" | "plan";

export default function TripRoom({ initial, llmOn }: { initial: TripState; llmOn: boolean }) {
  const tripId = initial.trip.id;
  const [state, setState] = useState<TripState>(initial);
  const [tab, setTab] = useState<Tab>("destinations");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, { cache: "no-store" });
      if (res.ok) setState((await res.json()) as TripState);
    } catch {
      /* offline — SSE will recover */
    }
  }, [tripId]);

  // Realtime: SSE ping → refetch (debounced). Poll as a safety net if SSE dies.
  useEffect(() => {
    let es: EventSource | null = null;
    let pending = false;
    const debounced = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        refresh();
      }, 120);
    };
    try {
      es = new EventSource(`/api/trips/${tripId}/events`);
      es.onmessage = (ev) => {
        try {
          if (JSON.parse(ev.data).type === "changed") debounced();
        } catch {
          /* ignore malformed */
        }
      };
    } catch {
      /* SSE unsupported — polling below still works */
    }
    const poll = setInterval(() => {
      if (!es || es.readyState === EventSource.CLOSED) refresh();
    }, 20_000);
    return () => {
      es?.close();
      clearInterval(poll);
    };
  }, [tripId, refresh]);

  // Confetti exactly once, when the decision locks live.
  const prevLocked = useRef(state.decision.locked);
  useEffect(() => {
    if (state.decision.locked && !prevLocked.current) {
      import("canvas-confetti").then((mod) => {
        mod.default({ particleCount: 160, spread: 80, origin: { y: 0.3 }, colors: ["#ff6b5a", "#0fa3a3", "#f5a524"] });
      });
    }
    prevLocked.current = state.decision.locked;
  }, [state.decision.locked]);

  const request = useCallback(
    async (method: "POST" | "DELETE" | "PATCH", path: string, body?: unknown) => {
      try {
        const res = await fetch(`/api/trips/${tripId}${path}`, {
          method,
          headers: body ? { "content-type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `${method} ${path} failed`);
        }
        return res.json().catch(() => ({}));
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong");
        refresh();
        throw e;
      }
    },
    [tripId, toast, refresh],
  );

  const post = useCallback(async (path: string, body?: unknown) => void (await request("POST", path, body)), [request]);
  const del = useCallback(async (path: string) => void (await request("DELETE", path)), [request]);

  /* ---------- optimistic vote handlers (SSE reconciles the truth) ---------- */

  const meId = state.me?.id ?? null;

  const voteDate: RoomProps["voteDate"] = useCallback(
    (optionId, status) => {
      setState((s) => {
        const dateOptions = s.dateOptions.map((o) => {
          if (o.id !== optionId) return o;
          const votes = { ...o.votes };
          if (status === "clear" || votes[meId ?? ""] === status) delete votes[meId ?? ""];
          else votes[meId ?? ""] = status;
          return { ...o, votes, tally: dateOptionTally(votes) };
        });
        return { ...s, dateOptions, decision: computeDecision(s.destinations, dateOptions, s.trip.deadline) };
      });
      post("/vote", { kind: "date", optionId, status }).catch(() => {});
    },
    [meId, post],
  );

  const voteDestination: RoomProps["voteDestination"] = useCallback(
    (destinationId, value) => {
      setState((s) => {
        const destinations = s.destinations.map((d) => {
          if (d.id !== destinationId) return d;
          const votes = { ...d.votes };
          if (value === 0 || votes[meId ?? ""] === value) delete votes[meId ?? ""];
          else votes[meId ?? ""] = value;
          return { ...d, votes, tally: destinationTally(votes) };
        });
        return { ...s, destinations, decision: computeDecision(destinations, s.dateOptions, s.trip.deadline) };
      });
      post("/vote", { kind: "destination", destinationId, value }).catch(() => {});
    },
    [meId, post],
  );

  const votePlace: RoomProps["votePlace"] = useCallback(
    (placeId) => {
      setState((s) => ({
        ...s,
        places: s.places.map((p) => {
          if (p.id !== placeId) return p;
          const mine = p.voterIds.includes(meId ?? "");
          return { ...p, voterIds: mine ? p.voterIds.filter((x) => x !== meId) : [...p.voterIds, meId ?? ""] };
        }),
      }));
      post("/vote", { kind: "place", placeId }).catch(() => {});
    },
    [meId, post],
  );

  const room: Omit<RoomProps, "state"> = { post, del, voteDate, voteDestination, votePlace, toast };
  const winner = state.destinations.find((d) => d.id === state.decision.winnerDestinationId);
  const bestDate = state.dateOptions.find((o) => o.id === state.decision.bestDateOptionId);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${state.trip.inviteCode}` : "";

  const tabs = useMemo(
    () =>
      [
        { key: "dates" as Tab, label: "Dates", count: state.dateOptions.length },
        { key: "destinations" as Tab, label: "Destinations", count: state.destinations.length },
        { key: "places" as Tab, label: "Places", count: state.places.length },
        { key: "plan" as Tab, label: "Plan", count: state.plan ? 1 : 0, check: Boolean(state.plan) },
      ] satisfies { key: Tab; label: string; count: number; check?: boolean }[],
    [state.dateOptions.length, state.destinations.length, state.places.length, state.plan],
  );

  async function setDeadline(days: number | null) {
    // the server computes the epoch — it owns deadline truth
    await request("PATCH", "", { deadlineDays: days });
    refresh();
    setSettingsOpen(false);
    toast(days ? `Decision locks in ${days} day${days > 1 ? "s" : ""}` : "Deadline removed");
  }

  async function setAnonymize(on: boolean) {
    await request("PATCH", "", { anonymize: on });
    refresh();
  }

  return (
    <div className="min-h-dvh pb-24">
      {/* ---------- header ---------- */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <Link href="/" className="hover:text-ink transition-colors font-medium">
              ← TripTally
            </Link>
            {state.isAdmin && <span className="chip !py-0.5 !px-2 !text-[11px] chip-on">you&apos;re the organizer</span>}
            {state.trip.anonymize && <span className="chip !py-0.5 !px-2 !text-[11px]">🕵️ anonymous voting</span>}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight truncate">{state.trip.name}</h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-ink-soft">
                {state.trip.budget && <span className="chip !py-0.5 !px-2 !text-[11px] !cursor-default">💰 {state.trip.budget}</span>}
                {state.trip.vibes.map((v) => (
                  <span key={v} className="chip !py-0.5 !px-2 !text-[11px] !cursor-default">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1.5" title={`${state.participants.length} on this trip`}>
                {state.participants.slice(0, 6).map((p) => (
                  <Avatar key={p.id} p={p} me={p.id === meId} size="sm" />
                ))}
                {state.participants.length > 6 && (
                  <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-gold-soft border border-line text-[11px] font-semibold">
                    +{state.participants.length - 6}
                  </span>
                )}
              </div>

              <div className="relative">
                <button className="btn btn-teal px-4 py-2 text-sm" onClick={() => setShareOpen((v) => !v)}>
                  Invite 📎
                </button>
                <AnimatePresence>
                  {shareOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="card absolute right-0 mt-2 p-4 w-80 z-40"
                    >
                      <p className="text-xs text-ink-soft">Drop this in the group chat:</p>
                      <div className="mt-2 flex gap-2">
                        <input readOnly className="field !py-2 text-xs" value={shareUrl} onFocus={(e) => e.target.select()} />
                        <button
                          className="btn btn-primary !px-3 py-2 text-xs shrink-0"
                          onClick={async () => {
                            await navigator.clipboard.writeText(shareUrl);
                            toast("Invite link copied ✅");
                            setShareOpen(false);
                          }}
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-ink-soft">
                        or the code <span className="font-mono font-semibold text-ink">{state.trip.inviteCode}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {state.isAdmin && (
                <div className="relative">
                  <button className="btn btn-ghost px-3 py-2 text-sm" onClick={() => setSettingsOpen((v) => !v)} aria-label="trip settings">
                    ⚙️
                  </button>
                  <AnimatePresence>
                    {settingsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="card absolute right-0 mt-2 p-4 w-72 z-40 text-sm"
                      >
                        <p className="font-semibold">Lock the decision in…</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            { label: "3 days", days: 3 },
                            { label: "1 week", days: 7 },
                            { label: "2 weeks", days: 14 },
                            { label: "Remove", days: null },
                          ].map((o) => (
                            <button key={o.label} className="chip" onClick={() => setDeadline(o.days!)}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="accent-[var(--coral)] w-4 h-4"
                            checked={state.trip.anonymize}
                            onChange={(e) => setAnonymize(e.target.checked)}
                          />
                          <span className="text-sm">Anonymous voting 🕵️</span>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* deadline / winner strip */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {state.trip.deadline !== null &&
              (state.decision.locked ? (
                <span className="chip !cursor-default !bg-ink !text-white !border-ink">🔒 Decision locked</span>
              ) : (
                <span className="chip !cursor-default !border-coral !bg-coral-soft !text-coral-deep">
                  ⏳ locks in&nbsp;<Countdown deadline={state.trip.deadline} />
                </span>
              ))}
            {bestDate && (
              <span className="chip !cursor-default">📅 best window: {formatDateRange(bestDate.startDate, bestDate.endDate)}</span>
            )}
            {winner && (
              <span className={`chip !cursor-default ${state.decision.locked ? "!bg-gold-soft !border-gold !text-ink" : ""}`}>
                {state.decision.locked ? "🏆" : "👑 leading:"} {winner.name}
              </span>
            )}
            <span className="text-ink-soft hidden sm:inline">{state.participants.length} planning</span>
          </div>

          {/* tabs */}
          <div className="mt-3 flex gap-1 bg-surface border border-line rounded-full p-1 w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-3.5 sm:px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === t.key ? "text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {tab === t.key && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  {t.label}
                  {t.check ? " ✓" : t.count > 0 ? ` ${t.count}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- tab content ---------- */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "dates" && <DatesTab state={state} {...room} />}
            {tab === "destinations" && <DestinationsTab state={state} {...room} />}
            {tab === "places" && <PlacesTab state={state} {...room} />}
            {tab === "plan" && <PlanTab state={state} {...room} llmOn={llmOn} onGenerated={refresh} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
