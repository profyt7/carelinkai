/**
 * GET /api/admin/concierge/metrics — concierge funnel numbers (sprint 4.4 /
 * W4-3), per DP and overall. Admin only; anything else → 403. Demo excluded.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { captureError } from '@/lib/sentry';
import { getConciergeMetrics } from '@/lib/concierge/metrics-engine';

export async function GET() {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const metrics = await getConciergeMetrics();
    return NextResponse.json(metrics, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'concierge-metrics' } });
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 });
  }
}
