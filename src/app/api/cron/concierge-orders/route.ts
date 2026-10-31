/**
 * POST /api/cron/concierge-orders — Family Concierge pay-when-ready sweep (OL-248). Called hourly by the
 * existing Render cron runner (scripts/run-cron.js, "carelinkai Reminders Processor"); no new Render job.
 *   - one reminder email 3 days after the payment link went out, if still unpaid;
 *   - still unpaid 14 days after → EXPIRED + an admin email (no more family emails).
 * Fails closed on CRON_SECRET (Authorization: Bearer or x-cron-secret). Returns counts only.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkCronAuth, cronUnauthorized } from '@/lib/cron-auth';
import { runConciergeOrderSweep } from '@/lib/concierge/pay-when-ready';
import { captureError } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  const auth = checkCronAuth(request.headers);
  if (!auth.ok) {
    const { body, status } = cronUnauthorized('concierge-orders', auth);
    return NextResponse.json(body, { status });
  }
  const started = Date.now();
  try {
    const r = await runConciergeOrderSweep();
    return NextResponse.json({ ok: true, ...r, durationMs: Date.now() - started });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'concierge-pay-when-ready', route: 'cron:concierge-orders' } });
    return NextResponse.json({ ok: false, error: 'Concierge sweep failed' }, { status: 500 });
  }
}
