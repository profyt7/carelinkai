export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyTwilioRequest } from '@/lib/twilio/verify-webhook';
import { handleCaregiverReply } from '@/lib/oncall/dispatcher';

// Twilio sends application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    // P0-7: reject anything Twilio didn't sign (was: any POST accepted).
    const verified = await verifyTwilioRequest(req);
    if (!verified.ok) return verified.response;
    const params = new URLSearchParams(verified.params);
    const messageSid = params.get('MessageSid') ?? '';
    const body = params.get('Body') ?? '';

    if (!messageSid) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const result = await handleCaregiverReply(messageSid, body);
    console.log(`[TWILIO SMS] action=${result.action} needId=${result.needId}`);

    // Return empty TwiML — no auto-reply (we send separate messages in the dispatcher)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('[TWILIO SMS webhook]', err);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
