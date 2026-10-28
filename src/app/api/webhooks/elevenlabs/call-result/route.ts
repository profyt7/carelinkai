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
 *
 * OL-180: ElevenLabs posts every agent's calls to one URL — register
 * /api/webhooks/elevenlabs (the router); this route stays for direct use.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { handleCallResult, verifyPostCall } from '@/lib/elevenlabs/post-call';

export async function POST(request: NextRequest) {
  const v = await verifyPostCall(request);
  return v.ok ? handleCallResult(v.payload) : v.response;
}
