/**
 * GET /api/cron/dp-followups
 *
 * Advances every due DP follow-up sequence by one touch (email-only). Intended to
 * run daily. Secure with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Self-gates on DP_FOLLOWUP_ENABLED — returns { disabled: true } and sends nothing
 * until Chris flips the flag. Idempotent: only 'active' leads whose nextTouchAt is
 * due are touched, at most one touch per lead per run.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { advanceDpSequences } from '@/lib/dp-outreach/dp-followup';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await advanceDpSequences();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to advance DP follow-ups' },
      { status: 500 },
    );
  }
}
