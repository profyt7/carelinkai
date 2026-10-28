export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCaregiverReply } from '@/lib/oncall/dispatcher';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get('attemptId') ?? '';

  const text = await req.text();
  const params = new URLSearchParams(text);
  const digits = params.get('Digits') ?? '';

  // Map IVR digit to keyword
  const replyMap: Record<string, string> = { '1': 'YES', '2': 'NO', '3': 'REPEAT' };
  const reply = replyMap[digits] ?? '';

  let twimlResponse = '';

  if (digits === '3') {
    // Repeat — redirect back to IVR
    const base = process.env.NEXTAUTH_URL ?? '';
    twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${base}/api/webhooks/twilio/voice?attemptId=${attemptId}</Redirect>
</Response>`;
  } else if (reply && attemptId) {
    // Look up messageSid via attemptId and delegate to the shared handler
    const attempt = await prisma.coverageAttempt.findUnique({
      where: { id: attemptId },
      select: { messageSid: true },
    });

    // For voice, we may not have a messageSid — handle directly
    if (attempt) {
      await prisma.coverageAttempt.update({
        where: { id: attemptId },
        data: { outcome: reply === 'YES' ? 'CONFIRMED' : 'DECLINED' },
      });

      if (reply === 'YES' && attempt.messageSid) {
        await handleCaregiverReply(attempt.messageSid, 'YES');
      }
    }

    const msg = reply === 'YES'
      ? 'Thank you for accepting! You are confirmed for this shift. Goodbye.'
      : 'Thank you for letting us know. Goodbye.';

    twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${msg}</Say>
  <Hangup/>
</Response>`;
  } else {
    twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid input. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  return new NextResponse(twimlResponse, { headers: { 'Content-Type': 'text/xml' } });
}
