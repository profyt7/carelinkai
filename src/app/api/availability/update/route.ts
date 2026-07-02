/**
 * POST /api/availability/update  — no-login, token-gated availability update (EMAIL channel).
 *
 * The email magic-link renders a +/- counter (see /availability/update) that POSTs
 * { token, count } here. The signed token (src/lib/availability/availability-token.ts)
 * authorizes an update to exactly ONE home's openings count — no account, no PHI.
 * Rate-limited by the middleware is not applicable (page route); the token itself is
 * the authorization + it expires.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAvailabilityToken } from '@/lib/availability/availability-token';
import { updateAvailability, normalizeCount } from '@/lib/availability/availability';

export async function POST(request: NextRequest) {
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  let body: { token?: string; count?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const payload = verifyAvailabilityToken(String(body.token || ''), secret);
  if (!payload) return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 401 });

  const count = normalizeCount(body.count);
  if (count === null) return NextResponse.json({ error: 'Please provide a number of openings.' }, { status: 400 });

  try {
    const view = await updateAvailability({ homeId: payload.homeId, count, source: 'EMAIL' });
    if (!view) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, view });
  } catch {
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 });
  }
}
