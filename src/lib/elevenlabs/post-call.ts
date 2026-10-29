/**
 * ElevenLabs post-call webhooks (OL-163 / OL-167 / OL-180).
 *
 * ElevenLabs sends every post-call event for the workspace to ONE URL, so
 * /api/webhooks/elevenlabs verifies the signature once and dispatches on
 * data.agent_id:
 *   Front Desk (inbound calls to the published number) → inbound-lead logic
 *   Listing Update (outbound availability calls)        → call-result logic
 *   unknown agent → a homeId in the payload ⇒ call-result, else inbound-lead
 * The two older per-purpose routes stay and call the same handlers.
 *
 * Agent ids: ELEVENLABS_AGENT_ID_FRONT_DESK / ELEVENLABS_AGENT_ID_LISTING_UPDATE
 * (defaults below). Auth: ELEVENLABS_WEBHOOK_SECRET; FAILS CLOSED — no secret
 * → 503, bad / stale signature → 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '@/lib/sentry';
import { ELEVENLABS_SIGNATURE_HEADER, parseCallResult, payloadHomeId, recordCallResult, verifyElevenLabsSignature } from '@/lib/availability/call-result';
import { parseInboundLead, recordInboundLead, CALLER_TYPE_TO_ENUM, URGENCY_TO_ENUM } from '@/lib/leads/inbound-lead';
import { sendFacilityObservationAlert, sendInboundLeadAlerts } from '@/lib/leads/inbound-alerts';
import { agentIds } from '@/lib/elevenlabs/agents';

export { DEFAULT_FRONT_DESK_AGENT_ID, DEFAULT_LISTING_UPDATE_AGENT_ID, agentIds } from '@/lib/elevenlabs/agents';

const noStore = { 'cache-control': 'no-store' };

export type PostCallRoute = 'inbound-lead' | 'call-result';
export type RouteDecision = { route: PostCallRoute; reason: 'front_desk_agent' | 'listing_update_agent' | 'fallback_home_id' | 'fallback_no_home_id' };

/** Pure: which handler a post-call payload belongs to. */
export function routePostCall(payload: unknown, env: NodeJS.ProcessEnv = process.env): RouteDecision {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const data = root['data'] && typeof root['data'] === 'object' ? (root['data'] as Record<string, unknown>) : root;
  const agentId = typeof data['agent_id'] === 'string' ? data['agent_id'].trim() : typeof data['agentId'] === 'string' ? (data['agentId'] as string).trim() : '';
  const ids = agentIds(env);
  if (agentId && agentId === ids.frontDesk) return { route: 'inbound-lead', reason: 'front_desk_agent' };
  if (agentId && agentId === ids.listingUpdate) return { route: 'call-result', reason: 'listing_update_agent' };
  return payloadHomeId(payload) ? { route: 'call-result', reason: 'fallback_home_id' } : { route: 'inbound-lead', reason: 'fallback_no_home_id' };
}

/** Signature check + JSON parse shared by all three routes. */
export async function verifyPostCall(request: NextRequest): Promise<{ ok: true; payload: unknown } | { ok: false; response: NextResponse }> {
  const secret = process.env['ELEVENLABS_WEBHOOK_SECRET'];
  if (!secret) return { ok: false, response: NextResponse.json({ error: 'Webhook not configured' }, { status: 503, headers: noStore }) };
  const rawBody = await request.text();
  const sig = verifyElevenLabsSignature({ secret, header: request.headers.get(ELEVENLABS_SIGNATURE_HEADER), rawBody });
  if (!sig.ok) return { ok: false, response: NextResponse.json({ error: 'Invalid signature', reason: sig.reason }, { status: 401, headers: noStore }) };
  try {
    return { ok: true, payload: JSON.parse(rawBody) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: noStore }) };
  }
}

/** One AI availability call → one AvailabilityObservation (qaStatus pending). */
export async function handleCallResult(payload: unknown): Promise<NextResponse> {
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

/** One inbound call → one InboundLead, or (FACILITY caller matched by number) one observation. */
export async function handleInboundLead(payload: unknown): Promise<NextResponse> {
  const type = (payload as { type?: unknown })?.type;
  if (typeof type === 'string' && type !== 'post_call_transcription' && type !== 'inbound_lead') {
    return NextResponse.json({ ok: true, ignored: type }, { status: 200, headers: noStore });
  }
  const parsed = parseInboundLead(payload);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  try {
    const result = await recordInboundLead(parsed.value);
    if (result.status === 'invalid') return NextResponse.json({ error: result.error }, { status: 400, headers: noStore });
    // OL-167b: alerts are fire-and-forget after the write — every caller type
    // emails (facility QA items too). A failure is logged, never surfaced to
    // the provider (the row is already in the table).
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
        facility: v.callerType === 'facility' ? v.facility : null,
      }).catch((e) => captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'webhooks/elevenlabs/inbound-lead', step: 'alerts' } }));
    }
    if (result.status === 'created' && result.lane === 'observation') {
      void sendFacilityObservationAlert({
        observationId: result.observationId,
        homeName: result.homeName,
        name: v.name,
        organization: v.organization,
        callbackPhone: phone,
        facility: v.facility,
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
