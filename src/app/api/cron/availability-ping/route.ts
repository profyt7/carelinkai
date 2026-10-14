/**
 * GET /api/cron/availability-ping — weekly one-tap availability ping (sprint W4-1).
 *
 * Secured with CRON_SECRET (fails CLOSED — unset secret = 401 for everyone).
 * Self-gates on PING_ENABLED: unset/falsy → { disabled: true }, nothing read or
 * written. Email transport only; SMS is a stub behind SMS_PING_ENABLED and no
 * provider is wired. Eligibility rules live in src/lib/availability/ping-engine.ts
 * (opted-in contacts of CLAIMED homes, or opt-ins captured by a human on a call;
 * never a demo listing; never an unclaimed listing).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { runAvailabilityPing, reportPingError } from '@/lib/availability/ping-engine';

export async function GET(request: NextRequest) {
  const cronSecret = process.env['CRON_SECRET'];
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runAvailabilityPing();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    reportPingError(error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Ping run failed' }, { status: 500 });
  }
}
