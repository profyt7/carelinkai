import { NextRequest, NextResponse } from 'next/server';
import { scheduleUpcomingAppointmentReminders } from '@/lib/services/reminders';

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
  const windowMinutes = typeof body.windowMinutes === 'number' ? body.windowMinutes : 1440;

  const result = await scheduleUpcomingAppointmentReminders(windowMinutes);
  return NextResponse.json({ success: true, ...result });
}
