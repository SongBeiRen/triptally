import Link from "next/link";
import CreateTripForm from "@/components/CreateTripForm";

// The demo trip is auto-seeded on server boot (see src/instrumentation.ts).
// The CTA is unconditional so the landing page stays fully static; if the demo
// is ever missing, /join/DEMO24 degrades to a friendly "link doesn't work" page.
const hasDemo = true;

const pains = [
  { emoji: "💬", title: "127 unread messages", text: "Dates, links and that one restaurant idea — spread across three chats and a spreadsheet nobody opens." },
  { emoji: "🙈", title: "Nobody vetoes out loud", text: "People skip the poll rather than be the friend who voted against the beach house." },
  { emoji: "🌀", title: "The plan dies in scroll-back", text: "The trip everyone wanted gets lost between memes and flight screenshots." },
];

const steps = [
  { emoji: "✍️", title: "Start a trip", text: "Drop in a couple of destination ideas, date windows and the vibe. Takes a minute." },
  { emoji: "🔗", title: "Share one link", text: "Friends join from their phone — no app, no account, no excuses." },
  { emoji: "🗳️", title: "Vote it out", text: "Everyone marks dates and votes on places, anonymously if the organizer chooses. The tally decides, not the loudest friend." },
  { emoji: "🗺️", title: "Get the plan", text: "A day-by-day itinerary built from what the group actually voted for." },
];

export default async function Home() {
  return (
    <div className="min-h-dvh">
      <header className="max-w-6xl mx-auto px-5 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <span aria-hidden>🧭</span> TripTally
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <a href="#how" className="hidden sm:inline text-ink-soft hover:text-ink transition-colors">
            How it works
          </a>
          {hasDemo && (
            <Link href="/join/DEMO24" className="btn btn-ghost px-4 py-2 text-sm">
              Open live demo
            </Link>
          )}
        </nav>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-5 pt-10 pb-16 sm:pt-20 text-center">
          <div className="chip !cursor-default mb-6 mx-auto w-fit">
            <span className="w-2 h-2 rounded-full bg-teal pulse-soft" /> group trips, minus the group chat
          </div>
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.08] font-semibold max-w-3xl mx-auto tracking-tight">
            Agree on the trip<span className="text-coral">.</span>
            <br className="hidden sm:block" /> Not on 200 messages.
          </h1>
          <p className="mt-6 text-lg text-ink-soft max-w-xl mx-auto leading-relaxed">
            TripTally gives your crew one link to vote on dates, destinations and places —
            then turns the winning picks into a day-by-day plan.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#create" className="btn btn-primary px-7 py-3.5 text-base">
              Start a trip — it&apos;s free
            </a>
            {hasDemo ? (
              <Link href="/join/DEMO24" className="btn btn-ghost px-7 py-3.5 text-base">
                Peek at a live trip →
              </Link>
            ) : (
              <span className="btn btn-ghost px-7 py-3.5 text-base !cursor-default">Peek at a live trip →</span>
            )}
          </div>
          <p className="mt-4 text-sm text-ink-soft">No accounts. No installs. Your friends just tap a link.</p>
        </section>

        <section className="max-w-6xl mx-auto px-5 pb-16">
          <div className="grid sm:grid-cols-3 gap-4">
            {pains.map((p) => (
              <div key={p.title} className="card p-6 text-left">
                <div className="text-2xl" aria-hidden>{p.emoji}</div>
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="max-w-6xl mx-auto px-5 pb-20">
          <h2 className="font-display text-3xl font-semibold text-center tracking-tight">How it works</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <div key={s.title} className="card p-6 relative">
                <span className="absolute top-5 right-6 font-display text-3xl text-line select-none" aria-hidden>
                  {i + 1}
                </span>
                <div className="text-2xl" aria-hidden>{s.emoji}</div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="create" className="max-w-3xl mx-auto px-5 pb-24">
          <h2 className="font-display text-3xl font-semibold text-center tracking-tight">Create your trip</h2>
          <p className="text-center text-ink-soft mt-2 text-sm">
            You&apos;ll get a single link to drop in the group chat. That&apos;s the whole onboarding.
          </p>
          <div className="mt-8">
            <CreateTripForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-soft">
        <div className="font-display text-base text-ink mb-1">
          <span aria-hidden>🧭</span> TripTally
        </div>
        Plan together, not over group chat. A portfolio project — built with Next.js, SQLite and a deterministic fallback brain.
      </footer>
    </div>
  );
}
