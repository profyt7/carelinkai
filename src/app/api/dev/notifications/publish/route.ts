import { NextRequest, NextResponse } from 'next/server';
import { publish } from '@/lib/server/sse';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Dev/e2e safety gate
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { topic, event = 'notify', payload } = await req.json();
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    publish(topic, event, payload ?? {});
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[dev/notifications/publish] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
