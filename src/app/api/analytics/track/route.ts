
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeEvent } from "@/lib/analytics/events";
import { opaqueId } from "@/lib/analytics/sanitize";

/**
 * OL-226 first-party funnel aggregate. The browser posts here only after analytics consent
 * (`consent: 'analytics'`), with an allowlisted funnel event and a random per-tab session id.
 * The payload is re-sanitized against the same allowlist; anything else is dropped unseen.
 * Stored: event name, listing id, session id, sanitized props, timestamp. Never stored or
 * logged: IP, user id, user agent, page URL, or any submitted text. Retention: 90 days
 * (purged by the daily credential-expiry cron).
 */
const MAX_BODY_BYTES = 2048;

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
    let body: any = null;
    try {
      body = JSON.parse(raw);
    } catch {
      return new NextResponse(null, { status: 204 });
    }
    // No analytics consent asserted → store nothing.
    if (body?.consent !== "analytics" || !opaqueId(body?.sid)) return new NextResponse(null, { status: 204 });
    const event = sanitizeEvent(body?.name, body?.props);
    if (!event) return new NextResponse(null, { status: 204 });

    const listingId = typeof event.props.listing_id === "string" ? event.props.listing_id : null;
    await prisma.analyticsEvent.create({
      data: {
        name: event.name,
        listingId,
        anonSessionId: String(body.sid),
        propsJson: event.props as any,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // Never log the payload: only the error class.
    console.error("Analytics track error", err instanceof Error ? err.name : "unknown");
    return new NextResponse(null, { status: 204 });
  }
}
