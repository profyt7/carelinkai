export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchWave } from '@/lib/oncall/dispatcher';
import { loadRules } from '@/lib/oncall/rules';

// Render cron: runs every 10 minutes
// Sends the next wave for any FILLING need whose last attempt is older than wave_cooldown_minutes
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rules = loadRules();
  const cooldownMs = rules.contact_strategy.wave_cooldown_minutes * 60 * 1000;
  const cutoff = new Date(Date.now() - cooldownMs);

  // Find FILLING needs with no confirmed/no-response outcome in recent cooldown window
  const fillingNeeds = await prisma.shiftNeed.findMany({
    where: {
      status: 'FILLING',
      currentWave: { lt: rules.contact_strategy.max_waves },
    },
    include: {
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const results: { needId: string; result: string }[] = [];

  for (const need of fillingNeeds) {
    const lastAttempt = need.attempts[0];
    if (!lastAttempt || lastAttempt.createdAt < cutoff) {
      // Cooldown elapsed — check if anyone confirmed
      const confirmed = await prisma.coverageAttempt.findFirst({
        where: { shiftNeedId: need.id, outcome: 'CONFIRMED' },
      });
      if (confirmed) continue; // already filled via webhook

      const result = await dispatchWave(need.id);
      results.push({ needId: need.id, result: result.reason });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
