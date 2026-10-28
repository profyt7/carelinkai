export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// IVR entry point — Twilio calls this when it dials a caregiver
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get('attemptId') ?? '';

  let shiftInfo = 'an upcoming shift';

  if (attemptId) {
    try {
      const attempt = await prisma.coverageAttempt.findUnique({
        where: { id: attemptId },
        include: {
          shiftNeed: {
            include: {
              home: true,
              shift: true,
            },
          },
        },
      });

      if (attempt?.shiftNeed) {
        const { home, shift } = attempt.shiftNeed;
        const startAt = shift?.startTime.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) ?? 'TBD';
        const endAt = shift?.endTime.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) ?? 'TBD';
        shiftInfo = `a shift at ${home.name} from ${startAt} to ${endAt}`;
      }
    } catch {
      // non-fatal
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${process.env.NEXTAUTH_URL}/api/webhooks/twilio/voice/accept?attemptId=${attemptId}" method="POST" timeout="8">
    <Say voice="Polly.Joanna">
      Hello, this is CareLinkAI calling about ${shiftInfo}.
      Press 1 to accept this shift.
      Press 2 to decline.
      Press 3 to repeat this message.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">We did not receive your input. Goodbye.</Say>
  <Hangup/>
</Response>`;

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
