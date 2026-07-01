/**
 * POST /api/webhooks/resend
 *
 * Resend delivery webhook → email suppression. Hard bounces and spam complaints
 * are written to `EmailSuppression` so the claim drip (and any future outreach)
 * never emails a dead/hostile address again — the drip engine already consults
 * EmailSuppression before every touch (see claim-engine/claim-drip.ts).
 *
 * Security: Resend signs webhooks with Svix. We verify the signature against
 * RESEND_WEBHOOK_SECRET and FAIL CLOSED (401/500) — no secret, no processing.
 * This endpoint is public (webhooks can't carry a session) and rate-limited by
 * the middleware (/api/webhooks/*).
 *
 * Only `email.bounced` (→ reason 'bounce') and `email.complained` (→ 'complaint')
 * suppress. Everything else (delivered/opened/clicked/…) is acknowledged + ignored.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';

const TOLERANCE_MS = 5 * 60 * 1000; // reject timestamps older/newer than 5 min (replay guard)

/** Verify a Svix-signed payload (Resend's webhook scheme). Returns true if valid. */
function verifySvix(secret: string, headers: { id: string; timestamp: string; signature: string }, body: string): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  // Replay guard: timestamp is unix seconds.
  const tsSec = Number(headers.timestamp);
  if (!Number.isFinite(tsSec) || Math.abs(Date.now() - tsSec * 1000) > TOLERANCE_MS) return false;

  // Secret is base64, optionally prefixed with "whsec_".
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${headers.id}.${headers.timestamp}.${body}`;
  const expected = createHmac('sha256', key).update(signedContent).digest('base64');

  // Header is a space-separated list of "v1,<base64sig>"; accept if any matches.
  for (const part of headers.signature.split(' ')) {
    const sig = part.split(',')[1] ?? part; // tolerate "v1,sig" or bare "sig"
    try {
      const a = Buffer.from(sig, 'base64');
      const b = Buffer.from(expected, 'base64');
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* malformed segment — try the next */
    }
  }
  return false;
}

function recipients(data: any): string[] {
  const to = data?.to;
  const arr = Array.isArray(to) ? to : to ? [to] : [];
  return arr
    .map((x: unknown) => (typeof x === 'string' ? x : (x as any)?.email))
    .filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'))
    .map((e: string) => e.trim().toLowerCase());
}

export async function POST(request: NextRequest) {
  const secret = process.env['RESEND_WEBHOOK_SECRET'];
  if (!secret) {
    // Fail closed — never process unverified webhooks.
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const ok = verifySvix(secret, {
    id: request.headers.get('svix-id') || '',
    timestamp: request.headers.get('svix-timestamp') || '',
    signature: request.headers.get('svix-signature') || '',
  }, body);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type: string = event?.type || '';
  const reason = type === 'email.bounced' ? 'bounce' : type === 'email.complained' ? 'complaint' : null;
  if (!reason) {
    return NextResponse.json({ ok: true, ignored: type || 'unknown' }); // ack non-suppressing events
  }

  const emails = recipients(event?.data);
  let suppressed = 0;
  for (const email of emails) {
    try {
      await prisma.emailSuppression.upsert({
        where: { email },
        update: { reason, source: 'resend-webhook' },
        create: { email, reason, source: 'resend-webhook' },
      });
      suppressed++;
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { feature: 'resend-webhook' }, extra: { email, type },
      });
    }
  }

  return NextResponse.json({ ok: true, type, suppressed });
}
