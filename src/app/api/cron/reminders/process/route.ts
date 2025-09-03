import { NextRequest, NextResponse } from 'next/server';
import { processDueScheduledNotifications } from '@/lib/services/reminders';

function authorize(req: NextRequest) {
  const secret = process.env['CRON_SECRET'] || '';
  const header = req.headers.get('x-cron-secret') || '';
  return secret && header && secret === header;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const maxPerRun = typeof body.maxPerRun === 'number' ? body.maxPerRun : 100;

  const result = await processDueScheduledNotifications(maxPerRun);
  return NextResponse.json({ success: true, ...result });
}
