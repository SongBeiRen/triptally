import Link from "next/link";
import { loadTripByInvite } from "@/lib/state";
import JoinForm from "@/components/JoinForm";

export const instant = false; // per-request DB read — this route is intentionally blocking

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const trip = await loadTripByInvite(code);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 py-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          <span aria-hidden>🧭</span> TripTally
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-20">
        {trip ? (
          <div className="w-full max-w-md">
            <p className="text-center text-sm text-ink-soft mb-2">You&apos;ve been invited to</p>
            <h1 className="font-display text-3xl font-semibold text-center tracking-tight">{trip.name}</h1>
            <p className="text-center text-sm text-ink-soft mt-2">
              Pick a name and avatar — no account needed.
            </p>
            <div className="mt-6">
              <JoinForm tripId={trip.id} />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-5xl" aria-hidden>🧭</div>
            <h1 className="font-display text-2xl font-semibold mt-4">This invite link doesn&apos;t work</h1>
            <p className="text-ink-soft mt-2 text-sm">
              The trip may have been removed, or the code has a typo.
            </p>
            <Link href="/" className="btn btn-primary px-6 py-3 mt-6 inline-flex">
              Start your own trip
            </Link>
          </div>
        )}      </main>
    </div>
  );
}
