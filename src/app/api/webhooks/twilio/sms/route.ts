export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleCaregiverReply } from '@/lib/oncall/dispatcher';

// Twilio sends application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
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
