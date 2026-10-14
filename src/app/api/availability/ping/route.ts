/**
 * POST /api/availability/ping  { token, reply }  — apply a one-tap ping reply.
 *
 * The ping token (unique per ping, expires with it) is the whole authorization:
 * it lets the holder set ONE home's openings count once, or opt the contact
 * out. No account, no PHI. A bare integer / "none" / "full" updates the
 * listing (source=PING); STOP opts out; anything else goes to the admin queue.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { applyPingReply, reportPingError } from '@/lib/availability/ping-engine';

export async function POST(request: NextRequest) {
  let body: { token?: unknown; reply?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const reply = typeof body.reply === 'string' || typeof body.reply === 'number' ? String(body.reply) : '';
  if (!token || token.length > 200) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  if (!reply.trim()) return NextResponse.json({ error: 'Reply with a number (0 is fine), or STOP.' }, { status: 400 });
  try {
    const result = await applyPingReply({ token, raw: reply, via: 'link' });
    if (!result.ok) {
      const status = result.error === 'invalid' ? 404 : result.error === 'expired' ? 410 : 409;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    reportPingError(error);
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 });
  }
}
