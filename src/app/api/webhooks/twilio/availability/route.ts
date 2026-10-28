/**
 * POST /api/webhooks/twilio/availability  — inbound SMS handler for the availability poll.
 *
 * DEDICATED endpoint (kept separate from the oncall shift-fill handler at
 * /api/webhooks/twilio/sms). Wire the availability poll's Twilio Messaging Service /
 * number's inbound webhook to THIS route at go-live.
 *
 * A facility contact replies to the weekly poll:
 *   - "3" (a number)  → sets that home's openings count, source=SMS, verified now.
 *   - "STOP" etc.     → opt out: availabilityOptIn=false for that number (suppression).
 *   - anything else   → friendly help reply.
 *
 * Security: validates the Twilio request signature (X-Twilio-Signature) with
 * TWILIO_AUTH_TOKEN — fails closed in production so nobody can spoof availability.
 * Business data only (no PHI). Consent (availabilityOptIn) was required to be texted;
 * STOP is honored instantly.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateAvailability, normalizeCount, toE164 } from '@/lib/availability/availability';

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function twiml(message?: string): NextResponse {
  const body = message ? `<Message>${escapeXml(message)}</Message>` : '';
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(request: NextRequest) {
  const authToken = process.env['TWILIO_AUTH_TOKEN'];

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  // Verify the request really came from Twilio.
  if (authToken) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio');
      const sig = request.headers.get('x-twilio-signature') || '';
      const base = (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
      const url = `${base}/api/webhooks/twilio/availability`;
      if (!twilio.validateRequest(authToken, sig, url, params)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } catch {
      if (process.env['NODE_ENV'] === 'production') return NextResponse.json({ error: 'Validation unavailable' }, { status: 503 });
    }
  } else if (process.env['NODE_ENV'] === 'production') {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const from = toE164(params['From']);
  const bodyRaw = (params['Body'] || '').trim();
  if (!from) return twiml();

  if (STOP_WORDS.has(bodyRaw.toUpperCase())) {
    await prisma.assistedLivingHome.updateMany({ where: { contactMobile: from }, data: { availabilityOptIn: false } });
    return twiml('You are unsubscribed from CareLinkAI availability texts. Reply START to opt back in.');
  }

  const count = normalizeCount(bodyRaw);
  if (count === null) {
    return twiml('Reply with a number (e.g. 3) for current openings, or STOP to opt out.');
  }

  // Match the number to the opted-in home; most-recently-verified wins if several share a line.
  const home = await prisma.assistedLivingHome.findFirst({
    where: { contactMobile: from, availabilityOptIn: true },
    orderBy: { availabilityVerifiedAt: 'desc' },
    select: { id: true, name: true },
  });
  if (!home) return twiml('We could not match your number to a listing. Reply STOP to opt out.');

  await updateAvailability({ homeId: home.id, count, source: 'SMS' });
  return twiml(`Thanks! ${home.name} now shows ${count} opening${count === 1 ? '' : 's'} on CareLinkAI, verified today.`);
}
