/**
 * GET /api/cron/reset-application-counts
 *
 * Resets applicationCount to 0 for all basic (non-Pro) caregivers.
 * Designed to run on the 1st of each month via Render's cron scheduler.
 *
 * Secure with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await (prisma as any).caregiver.updateMany({
      where: { isPro: false },
      data: {
        applicationCount: 0,
        applicationCountResetAt: new Date(),
      },
    });

    console.log(`[Cron] reset-application-counts: reset ${result.count} caregivers`);

    return NextResponse.json({
      success: true,
      resetCount: result.count,
      resetAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] reset-application-counts error:', error);
    return NextResponse.json({ error: 'Failed to reset application counts' }, { status: 500 });
  }
}
