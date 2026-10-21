/**
 * POST /api/webhooks/elevenlabs/inbound-lead — ElevenLabs post-call webhook
 * for the published CareLinkAI phone number (OL-167a).
 *
 * One inbound call → one InboundLead (PLANNER / FAMILY / OTHER) or, for a
 * FACILITY caller matched by the number the call came from, one
 * AvailabilityObservation (source AI_CALL_INBOUND, qaStatus pending).
 *
 * Auth: the SAME HMAC verifier and secret name as /api/webhooks/elevenlabs/
 * call-result (ELEVENLABS_WEBHOOK_SECRET). FAILS CLOSED: no secret → 503,
 * bad / stale signature → 401. Idempotent on conversation_id.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '@/lib/sentry';
import { ELEVENLABS_SIGNATURE_HEADER, verifyElevenLabsSignature } from '@/lib/availability/call-result';
import { parseInboundLead, recordInboundLead, CALLER_TYPE_TO_ENUM, URGENCY_TO_ENUM } from '@/lib/leads/inbound-lead';
import { sendInboundLeadAlerts } from '@/lib/leads/inbound-alerts';

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
  const type = (payload as { type?: unknown })?.type;
  if (typeof type === 'string' && type !== 'post_call_transcription' && type !== 'inbound_lead') {
    return NextResponse.json({ ok: true, ignored: type }, { status: 200, headers: noStore });
  }

  const parsed = parseInboundLead(payload);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });

  try {
    const result = await recordInboundLead(parsed.value);
    if (result.status === 'invalid') return NextResponse.json({ error: result.error }, { status: 400, headers: noStore });
    // OL-167b: alerts are fire-and-forget after the write. A failure is logged,
    // never surfaced to the provider (the lead is already in the table).
    const v = parsed.value;
    const phone = v.callbackPhone;
    if (result.status === 'created' && result.lane === 'lead' && phone) {
      void sendInboundLeadAlerts({
        leadId: result.leadId,
        callerType: CALLER_TYPE_TO_ENUM[v.callerType],
        name: v.name,
        organization: v.organization,
        callbackPhone: phone,
        urgency: v.urgency ? URGENCY_TO_ENUM[v.urgency] : null,
        afterHours: v.afterHours,
        phiFlag: v.callerType === 'facility' ? false : v.phiFlag,
        transcriptUrl: v.transcriptUrl,
        recordingUrl: v.recordingUrl,
        receivedAt: v.receivedAt,
      }).catch((e) => captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'webhooks/elevenlabs/inbound-lead', step: 'alerts' } }));
    }
    const body =
      result.lane === 'lead'
        ? { ok: true, lane: 'lead', leadId: result.leadId, duplicate: result.status === 'duplicate', phiFlag: parsed.value.phiFlag }
        : { ok: true, lane: 'observation', observationId: result.observationId, duplicate: result.status === 'duplicate', qaStatus: 'pending' };
    return NextResponse.json(body, { status: 200, headers: noStore });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'webhooks/elevenlabs/inbound-lead' } });
    return NextResponse.json({ error: 'Failed to record inbound call' }, { status: 500, headers: noStore });
  }
}
