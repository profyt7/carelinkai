/**
 * POST /api/availability/voice-result  — AI-voice fallback result sink (VOICE channel).
 *
 * An external AI-voice platform (Synthflow / Retell) calls a facility's LANDLINE,
 * asks current availability (informational — updating their free listing, disclosed
 * as an automated CareLinkAI assistant), and POSTs the parsed result here:
 *   { "homeId": "...", "count": 3 }   (count may be null if the facility declined)
 *
 * Auth: shared secret via `Authorization: Bearer <AVAILABILITY_VOICE_SECRET>`.
 * FAILS CLOSED — no secret configured, or a mismatch, → 401/500. Never trust an
 * unauthenticated caller to write availability. Business data only (no PHI).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { updateAvailability, normalizeCount } from '@/lib/availability/availability';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const secret = process.env['AVAILABILITY_VOICE_SECRET'];
  if (!secret) return NextResponse.json({ error: 'Voice webhook not configured' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { homeId?: string; count?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const homeId = String(body.homeId || '');
  if (!homeId) return NextResponse.json({ error: 'homeId required' }, { status: 400 });

  const exists = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // count may be omitted/null (facility didn't give a number) — we still stamp the
  // attempt as VOICE-verified with a null count so freshness reflects the call.
  const count = body.count == null ? null : normalizeCount(body.count);
  const view = await updateAvailability({ homeId, count, source: 'VOICE' });
  return NextResponse.json({ ok: true, view });
}
