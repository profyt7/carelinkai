import { NextRequest, NextResponse } from 'next/server';
import { processDueScheduledNotifications } from '@/lib/services/reminders';
import { rateLimit } from '@/lib/server/rate-limit';

function authorize(req: NextRequest) {
  const secret = process.env['CRON_SECRET'] || '';
  const header = req.headers.get('x-cron-secret') || '';
  return secret && header && secret === header;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ---------------------------------------------
  // Rate-limit protection (defaults to 1 / minute)
  // ---------------------------------------------
  const { allowed, resetAt } = await rateLimit(
    'cron:reminders:process',
    parseInt(process.env.CRON_RATE_LIMIT_PER_MINUTE || '1', 10),
    60,
  );

  if (!allowed) {
    const retryAfter = Math.max(1, resetAt - Math.floor(Date.now() / 1000));
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: { 'Retry-After': retryAfter.toString(), 'Content-Type': 'application/json' },
      },
    );
  }

  const body = await req.json().catch(() => ({}));
  const maxPerRun = typeof body.maxPerRun === 'number' ? body.maxPerRun : 100;

  const started = Date.now();
  const result = await processDueScheduledNotifications(maxPerRun);
  const durationMs = Date.now() - started;

  // Basic metrics logging
  console.log('[cron] reminders:process', {
    ...result,
    maxPerRun,
    durationMs,
  });

  return NextResponse.json({ success: true, durationMs, ...result });
}
