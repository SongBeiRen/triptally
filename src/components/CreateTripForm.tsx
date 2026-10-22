"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const EMOJIS = ["🧭", "🦊", "🐻", "🦉", "🐙", "🦜", "🐧", "🦋", "🐝", "🐬", "🦁", "🐨"];

const CITY_SUGGESTIONS = ["Lisbon", "Barcelona", "Porto", "Rome", "Prague", "Athens", "Amsterdam", "Budapest"];

const VIBES = ["food", "culture", "chill", "party", "nature", "adventure", "beach", "budget"];

const DEADLINE_OPTIONS = [
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "No deadline", days: null },
] as const;

function nextFriday() {
  const d = new Date();
  const delta = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function plusDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type DestDraft = { name: string; country: string };
type WindowDraft = { start: string; end: string };

export default function CreateTripForm() {
  const router = useRouter();
  const [tripName, setTripName] = useState("");
  const [yourName, setYourName] = useState("");
  const [emoji, setEmoji] = useState("🧭");
  const [destinations, setDestinations] = useState<DestDraft[]>([
    { name: "", country: "" },
    { name: "", country: "" },
  ]);
  const [windows, setWindows] = useState<WindowDraft[]>([{ start: "", end: "" }]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [deadlineDays, setDeadlineDays] = useState<number | null>(7);
  const [anonymize, setAnonymize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    tripName.trim().length >= 2 &&
    yourName.trim().length >= 1 &&
    destinations.some((d) => d.name.trim().length > 0);

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripName: tripName.trim(),
          yourName: yourName.trim(),
          emoji,
          budget: budget.trim(),
          vibes,
          notes: notes.trim(),
          anonymize,
          deadlineDays,
          destinations: destinations
            .filter((d) => d.name.trim())
            .map((d) => ({ name: d.name.trim(), country: d.country.trim() })),
          dateOptions: windows.filter((w) => w.start && w.end),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the trip");
      router.push(`/trip/${data.tripId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8 text-left">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Trip name</span>
          <input
            className="field mt-1.5"
            placeholder="Squad city break, Cabin weekend…"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            maxLength={80}
          />
        </label>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">You are</span>
          <div className="mt-1.5 flex gap-2">
            <input
              className="field"
              placeholder="Your name"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              maxLength={40}
            />
            <div className="flex gap-1 overflow-x-auto pb-1 shrink-0">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 shrink-0 rounded-xl border text-lg transition-all ${
                    emoji === e ? "border-coral bg-coral-soft scale-105" : "border-line bg-surface hover:bg-gold-soft"
                  }`}
                  aria-label={`avatar ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Destination ideas</span>
          <p className="text-xs text-ink-soft mt-0.5">Add 2–3 candidates — the group votes later.</p>
          <div className="mt-2 space-y-2">
            {destinations.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="field"
                  placeholder="City"
                  value={d.name}
                  onChange={(e) => setDestinations((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  maxLength={60}
                />
                <input
                  className="field !w-32"
                  placeholder="Country"
                  value={d.country}
                  onChange={(e) => setDestinations((arr) => arr.map((x, j) => (j === i ? { ...x, country: e.target.value } : x)))}
                  maxLength={40}
                />
                {destinations.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost !px-3 shrink-0"
                    onClick={() => setDestinations((arr) => arr.filter((_, j) => j !== i))}
                    aria-label="remove destination"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            {destinations.length < 8 && (
              <button type="button" className="chip" onClick={() => setDestinations((arr) => [...arr, { name: "", country: "" }])}>
                + add
              </button>
            )}
            {CITY_SUGGESTIONS.slice(0, 6).map(
              (c) =>
                !destinations.some((d) => d.name.toLowerCase() === c.toLowerCase()) && (
                  <button
                    key={c}
                    type="button"
                    className="chip"
                    onClick={() => setDestinations((arr) => (arr[arr.length - 1]?.name ? [...arr, { name: c, country: "" }] : arr.map((x, i) => (i === arr.length - 1 ? { ...x, name: c } : x))))}
                  >
                    {c}
                  </button>
                ),
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Date windows that could work</span>
          <div className="mt-2 space-y-2">
            {windows.map((w, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="date"
                  className="field"
                  value={w.start}
                  onChange={(e) => setWindows((arr) => arr.map((x, j) => (j === i ? { ...x, start: e.target.value, end: x.end < e.target.value ? plusDays(e.target.value, 3) : x.end } : x)))}
                />
                <span className="text-ink-soft text-sm">→</span>
                <input
                  type="date"
                  className="field"
                  value={w.end}
                  min={w.start}
                  onChange={(e) => setWindows((arr) => arr.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                />
                {windows.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost !px-3 shrink-0"
                    onClick={() => setWindows((arr) => arr.filter((_, j) => j !== i))}
                    aria-label="remove window"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {windows.length < 6 && (
            <button
              type="button"
              className="chip mt-2"
              onClick={() => {
                const last = windows[windows.length - 1];
                const base = last?.end || nextFriday();
                const start = plusDays(base, 14);
                setWindows((arr) => [...arr, { start, end: plusDays(start, 3) }]);
              }}
            >
              + add another window
            </button>
          )}
        </div>

        <label className="block">
          <span className="text-sm font-medium">Budget (optional)</span>
          <input className="field mt-1.5" placeholder="€500–700 each" value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={60} />
        </label>

        <div>
          <span className="text-sm font-medium">Decision deadline</span>
          <p className="text-xs text-ink-soft mt-0.5">Votes lock and the winner wins.</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {DEADLINE_OPTIONS.map((o) => (
              <button key={o.label} type="button" className={`chip ${deadlineDays === o.days ? "chip-on" : ""}`} onClick={() => setDeadlineDays(o.days)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Vibe</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {VIBES.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip ${vibes.includes(v) ? "chip-on" : ""}`}
                onClick={() => setVibes((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]))}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Anything else the plan should know? (optional)</span>
          <textarea
            className="field mt-1.5 min-h-20"
            placeholder="Vegetarians, no hostels, direct flights only, one museum max…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>

        <label className="sm:col-span-2 flex items-start gap-3 cursor-pointer select-none rounded-xl border border-line bg-surface p-4">
          <input type="checkbox" className="mt-0.5 accent-[var(--coral)] w-4 h-4" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} />
          <span>
            <span className="text-sm font-medium">Anonymous voting</span>
            <span className="block text-xs text-ink-soft mt-0.5">
              Only show vote counts — never who voted for what. Easier for people to be honest.
            </span>
          </span>
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-coral-deep">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        <span className="text-xs text-ink-soft hidden sm:block">You&apos;ll get a share link for the group chat next.</span>
        <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn btn-primary px-7 py-3 text-base" onClick={submit} disabled={!valid || busy}>
          {busy ? "Creating…" : "Create trip & get link →"}
        </motion.button>
      </div>
    </div>
  );
}
