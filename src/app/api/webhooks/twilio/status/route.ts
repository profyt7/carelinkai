export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyTwilioRequest } from '@/lib/twilio/verify-webhook';
import { prisma } from '@/lib/prisma';

// Delivery status callback from Twilio
export async function POST(req: NextRequest) {
  try {
    // P0-7: reject anything Twilio didn't sign (was: any POST accepted).
    const verified = await verifyTwilioRequest(req);
    if (!verified.ok) return verified.response;
    const params = new URLSearchParams(verified.params);
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
