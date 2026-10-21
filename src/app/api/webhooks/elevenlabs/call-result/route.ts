/**
 * POST /api/webhooks/elevenlabs/call-result — ElevenLabs post-call webhook (OL-163a).
 *
 * One AI availability call → one AvailabilityObservation (qaStatus pending) +
 * a history row. Nothing here changes the home's public availability; the
 * admin QA queue (OL-163c) does that on approval.
 *
 * Auth: HMAC signature in `ElevenLabs-Signature` verified with
 * ELEVENLABS_WEBHOOK_SECRET (name only — Chris sets the value in Render).
 * FAILS CLOSED: no secret → 503, bad / stale signature → 401.
 * Idempotent on conversation_id: a redelivery returns 200 { duplicate: true }.
 * Unknown homeId → 200 { ignored: 'unknown_home' } so the provider stops
 * retrying; the miss is reported to Sentry for the agent's field mapping.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '@/lib/sentry';
import {
  ELEVENLABS_SIGNATURE_HEADER,
  parseCallResult,
  recordCallResult,
  verifyElevenLabsSignature,
} from '@/lib/availability/call-result';

const noStore = { 'cache-control': 'no-store' };

export async function POST(request: NextRequest) {
  const secret = process.env['ELEVENLABS_WEBHOOK_SECRET'];
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503, headers: noStore });

  const rawBody = await request.text();
  const sig = verifyElevenLabsSignature({ secret, header: request.headers.get(ELEVENLABS_SIGNATURE_HEADER), rawBody });
  if (!sig.ok) return NextResponse.json({ error: 'Invalid signature', reason: sig.reason }, { status: 401, headers: noStore });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: noStore });
  }
  // Only call-result events carry an observation; acknowledge anything else.
  const type = (payload as { type?: unknown })?.type;
  if (typeof type === 'string' && type !== 'post_call_transcription' && type !== 'call_result') {
    return NextResponse.json({ ok: true, ignored: type }, { status: 200, headers: noStore });
  }

  const parsed = parseCallResult(payload);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });

  try {
    const result = await recordCallResult(parsed.value);
    if (result.status === 'unknown_home') {
      captureError(new Error('elevenlabs call-result: unknown homeId'), {
        tags: { route: 'webhooks/elevenlabs/call-result' },
        extra: { conversationId: parsed.value.conversationId, homeId: parsed.value.homeId },
      });
      return NextResponse.json({ ok: false, ignored: 'unknown_home', conversationId: parsed.value.conversationId }, { status: 200, headers: noStore });
    }
    return NextResponse.json(
      { ok: true, observationId: result.observationId, duplicate: result.status === 'duplicate', qaStatus: 'pending' },
      { status: 200, headers: noStore },
    );
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'webhooks/elevenlabs/call-result' } });
    return NextResponse.json({ error: 'Failed to record call result' }, { status: 500, headers: noStore });
  }
}
