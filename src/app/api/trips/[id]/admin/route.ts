import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadTrip } from "@/lib/state";
import { adminCookieName, COOKIE_OPTS } from "@/lib/session";

/**
 * Organizer link target: /api/trips/<id>/admin?token=<secret>
 * Validates the token, sets the admin cookie, and redirects into the room so the
 * link keeps working across devices.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("token");

  const trip = await loadTrip(id);
  if (!trip || !token || token !== trip.adminToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const jar = await cookies();
  jar.set(adminCookieName(id), token, COOKIE_OPTS);
  return NextResponse.redirect(new URL(`/trip/${id}`, req.url));
}
