/**
 * GET /api/cron/claim-drip
 *
 * Advances every due per-facility claim drip by one touch (email-only). Intended
 * to run daily. Secure with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Idempotent: only homes whose claimDripNextAt is due and that aren't stopped are
 * touched, and each run advances a home by at most one touch.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { advanceClaimDrips } from '@/lib/claim-engine/claim-drip';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await advanceClaimDrips();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to advance claim drips' },
      { status: 500 },
    );
  }
}
