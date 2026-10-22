"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOJIS = ["🧭", "🦊", "🐻", "🦉", "🐙", "🦜", "🐧", "🦋", "🐝", "🐬", "🦁", "🐨"];

export default function JoinForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦊");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not join");
      router.push(`/trip/${tripId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input
          className="field mt-1.5"
          placeholder="What everyone calls you"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
          maxLength={40}
          autoFocus
        />
      </label>

      <div className="mt-4">
        <span className="text-sm font-medium">Avatar</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-11 h-11 rounded-xl border text-xl transition-all ${
                emoji === e ? "border-coral bg-coral-soft scale-105" : "border-line bg-surface hover:bg-gold-soft"
              }`}
              aria-label={`avatar ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-coral-deep">{error}</p>}

      <button className="btn btn-primary w-full py-3 mt-6" onClick={join} disabled={!name.trim() || busy}>
        {busy ? "Joining…" : "Join the trip →"}
      </button>
    </div>
  );
}
