"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ParticipantDTO, TripState } from "@/lib/types";

const GRADIENTS = [
  "from-[#ff9a8b] to-[#ff6a88]",
  "from-[#7ee8fa] to-[#0fa3a3]",
  "from-[#f6d365] to-[#f5a524]",
  "from-[#a8edea] to-[#7873f5]",
  "from-[#fbc2eb] to-[#a18cd1]",
  "from-[#84fab0] to-[#8fd3f4]",
];

/** Deterministic gradient pick per name — used for destination card covers. */
export function gradientFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/** Emoji avatar circle; ring highlight when it's you. */
export function Avatar({
  p,
  me,
  size = "md",
  title,
}: {
  p: ParticipantDTO;
  me?: boolean;
  size?: "sm" | "md";
  title?: string;
}) {
  const dim = size === "sm" ? "w-7 h-7 text-sm" : "w-9 h-9 text-lg";
  return (
    <span
      title={title ?? `${p.name}${me ? " (you)" : ""}`}
      className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full border ${
        me ? "border-coral ring-2 ring-coral-soft bg-coral-soft" : "border-line bg-surface"
      }`}
    >
      {p.emoji}
    </span>
  );
}

export function AvatarStack({ people, max = 5 }: { people: ParticipantDTO[]; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} p={p} size="sm" />
      ))}
      {rest > 0 && (
        <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-gold-soft border border-line text-[11px] font-semibold text-ink">
          +{rest}
        </span>
      )}
    </span>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Live countdown pill; turns coral under an hour. */
export function Countdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = deadline - now;
  if (diff <= 0) return <span className="tabular-nums">locked 🔒</span>;

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const urgent = diff < 3_600_000;

  return (
    <span className={`tabular-nums ${urgent ? "pulse-soft" : ""}`} suppressHydrationWarning>
      {d > 0 ? `${d}d ` : ""}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

/** Shared prop bundle every tab receives. */
export type RoomProps = {
  state: TripState;
  post: (path: string, body?: unknown) => Promise<void>;
  del: (path: string) => Promise<void>;
  voteDate: (optionId: string, status: "yes" | "maybe" | "no" | "clear") => void;
  voteDestination: (destinationId: string, value: 2 | 1 | -1 | 0) => void;
  votePlace: (placeId: string) => void;
  toast: (msg: string) => void;
};

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{children}</h2>
      {hint && <p className="text-sm text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

export function EmptyState({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-10 text-center text-ink-soft"
    >
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <h3 className="font-display text-lg font-semibold text-ink mt-3">{title}</h3>
      <p className="text-sm mt-1 max-w-sm mx-auto">{text}</p>
    </motion.div>
  );
}
