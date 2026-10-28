export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Delivery status callback from Twilio
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const messageSid = params.get('MessageSid') ?? '';
    const status = params.get('MessageStatus') ?? '';

    if (messageSid && status) {
      const attempt = await prisma.coverageAttempt.findFirst({ where: { messageSid } });
      if (attempt && attempt.outcome === 'SENT') {
        // Mark delivery failures
        if (['failed', 'undelivered'].includes(status)) {
          await prisma.coverageAttempt.update({
            where: { id: attempt.id },
            data: { outcome: 'ERROR', notes: `delivery=${status}` },
          });
        }
      }
    }
  } catch (err) {
    console.error('[TWILIO STATUS webhook]', err);
  }

  return NextResponse.json({ ok: true });
}
