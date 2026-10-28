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
 *
 * OL-180: ElevenLabs posts every agent's calls to one URL — register
 * /api/webhooks/elevenlabs (the router); this route stays for direct use.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { handleInboundLead, verifyPostCall } from '@/lib/elevenlabs/post-call';

export async function POST(request: NextRequest) {
  const v = await verifyPostCall(request);
  return v.ok ? handleInboundLead(v.payload) : v.response;
}
