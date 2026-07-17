/**
 * POST /api/webhooks/resend — Resend bounce/complaint webhook
 * (fix/resend-bounce-suppression).
 *
 * Keeps the suppression list fresh automatically: every hard bounce or spam
 * complaint Resend reports is added to `EmailSuppression`, so the guarded send
 * path (src/lib/email.ts) never re-sends to that address. This is what stops the
 * ~27% bounce rate from creeping back after the one-time cleanup.
 *
 * Security: Resend signs webhooks with Svix. We verify via the Resend SDK's
 * native `webhooks.verify()` (Svix is bundled — no new dependency) using
 * RESEND_WEBHOOK_SECRET. Mirrors the Stripe webhook: raw body, production
 * hard-fails on a missing secret/signature, verification errors → 400. A dev
 * bypass (ALLOW_DEV_ENDPOINTS=1) allows unsigned local testing.
 *
 * Events handled: `email.bounced` (Permanent/Undetermined → suppress; Transient
 * soft bounces are ignored) and `email.complained` (always suppress). Everything
 * else 200s as a no-op so Resend doesn't retry.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { addSuppressions } from '@/lib/email/suppression';
import { captureError } from '@/lib/sentry';

const resend = new Resend(process.env.RESEND_API_KEY);

type ResendWebhookEvent = {
  type?: string;
  data?: {
    to?: string | string[];
    email?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

/** Pull recipient address(es) out of a Resend event payload. */
function recipientsOf(data: ResendWebhookEvent['data']): string[] {
  if (!data) return [];
  const out: string[] = [];
  if (Array.isArray(data.to)) out.push(...data.to);
  else if (typeof data.to === 'string') out.push(data.to);
  if (typeof data.email === 'string') out.push(data.email);
  return out.filter(Boolean);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env['RESEND_WEBHOOK_SECRET'];
  const svixId = request.headers.get('svix-id') || '';
  const svixTimestamp = request.headers.get('svix-timestamp') || '';
  const svixSignature = request.headers.get('svix-signature') || '';
  const isProd = process.env['NODE_ENV'] === 'production';
  const devBypass = !isProd && process.env['ALLOW_DEV_ENDPOINTS'] === '1';

  let event: ResendWebhookEvent;
  try {
    if (secret && svixSignature) {
      // Native Svix verification (throws on mismatch/expiry).
      event = resend.webhooks.verify({
        payload: rawBody,
        headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
        webhookSecret: secret,
      }) as ResendWebhookEvent;
    } else if (devBypass) {
      event = JSON.parse(rawBody) as ResendWebhookEvent;
    } else {
      // Production (or any non-dev) MUST be signed.
      if (!secret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { tags: { route: 'webhooks:resend' }, extra: { phase: 'verify' } });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const type = event?.type;
    const recipients = recipientsOf(event?.data);

    if (type === 'email.complained' && recipients.length) {
      await addSuppressions(recipients, 'complaint', 'resend-webhook', { overwriteReason: true });
      console.warn(`[Resend webhook] complaint → suppressed ${recipients.length}: ${recipients.join(', ')}`);
    } else if (type === 'email.bounced' && recipients.length) {
      const bounceType = (event.data?.bounce?.type || '').toLowerCase();
      // Suppress permanent + undetermined; ignore transient (soft) bounces.
      if (bounceType !== 'transient') {
        await addSuppressions(recipients, 'bounce', 'resend-webhook');
        console.warn(`[Resend webhook] ${bounceType || 'hard'} bounce → suppressed ${recipients.length}: ${recipients.join(', ')}`);
      }
    }
    // All events (incl. delivered/opened/clicked/soft-bounce) acknowledge 200.
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { tags: { route: 'webhooks:resend' }, extra: { phase: 'handle', type: event?.type } });
    // 200 so Resend doesn't hammer retries for a transient DB error; the periodic
    // dashboard export + import script is the backstop for anything missed.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
