/**
 * POST /api/webhooks/elevenlabs — the ONE post-call webhook URL to register in
 * ElevenLabs (OL-180). The workspace sends every agent's post-call events
 * here; this verifies the HMAC once (ELEVENLABS_WEBHOOK_SECRET — 503 when
 * unset, 401 on a bad / stale signature) and dispatches on data.agent_id:
 *   Front Desk     (ELEVENLABS_AGENT_ID_FRONT_DESK)     → inbound-lead
 *   Listing Update (ELEVENLABS_AGENT_ID_LISTING_UPDATE) → call-result
 *   unknown agent  → homeId in the payload ⇒ call-result, else inbound-lead
 * See src/lib/elevenlabs/post-call.ts.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { handleCallResult, handleInboundLead, routePostCall, verifyPostCall } from '@/lib/elevenlabs/post-call';

export async function POST(request: NextRequest) {
  const v = await verifyPostCall(request);
  if (!v.ok) return v.response;
  const decision = routePostCall(v.payload);
  const res = decision.route === 'call-result' ? await handleCallResult(v.payload) : await handleInboundLead(v.payload);
  res.headers.set('x-carelink-post-call-route', `${decision.route};${decision.reason}`);
  return res;
}
