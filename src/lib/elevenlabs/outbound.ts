/**
 * OL-183 — outbound Listing Update (availability) calls.
 *
 * Every outbound call must present the CareLinkAI number +1 216 677 3569, which
 * is ElevenLabs phone number `phnum_5301m5qnzd3tejtr4yjej69ph6k6`, set in env as
 * ELEVENLABS_PHONE_NUMBER_ID. This module is the only place the app starts
 * outbound calls. It fails closed: with no phone number id, no call is placed,
 * an error is logged, and the result says why. It never throws to the caller.
 *
 * Until now no code started outbound calls. The weekly batch was launched by
 * hand in the ElevenLabs dashboard from the CSV at
 * /api/admin/availability/call-list, where the caller number is picked by hand.
 */
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/sentry';
import { LISTING_UPDATE_CALLER_ID, LISTING_UPDATE_CALLER_ID_DISPLAY, agentIds, outboundPhoneNumberId } from '@/lib/elevenlabs/agents';
import type { CallListRow } from '@/lib/availability/call-rules';

export { LISTING_UPDATE_CALLER_ID, LISTING_UPDATE_CALLER_ID_DISPLAY, outboundPhoneNumberId };
export const ELEVENLABS_BATCH_CALL_URL = 'https://api.elevenlabs.io/v1/convai/batch-calling/submit';

type Env = NodeJS.ProcessEnv;

export type OutboundFailure = 'phone_number_id_missing' | 'api_key_missing' | 'no_recipients' | 'api_error';
export type BatchSubmitResult =
  | { ok: true; batchId: string | null; recipients: number; agentPhoneNumberId: string }
  | { ok: false; reason: OutboundFailure; status?: number };

function configFailure(reason: OutboundFailure, extra: Record<string, unknown> = {}): BatchSubmitResult {
  const err = new Error(`Outbound Listing Update call not placed: ${reason}`);
  logger.error('outbound_call_not_placed', { reason, ...extra });
  captureError(err, { tags: { area: 'elevenlabs-outbound', reason } });
  return { ok: false, reason };
}

/** Request body for one ElevenLabs batch-call job (the Listing Update agent, the CareLinkAI caller id). */
export function buildBatchCallRequest(
  rows: CallListRow[],
  { callName, agentId, agentPhoneNumberId }: { callName: string; agentId: string; agentPhoneNumberId: string },
) {
  return {
    call_name: callName,
    agent_id: agentId,
    agent_phone_number_id: agentPhoneNumberId,
    recipients: rows.map((r) => ({
      phone_number: r.phone,
      conversation_initiation_client_data: {
        dynamic_variables: { homeId: r.homeId, name: r.name, city: r.city },
      },
    })),
  };
}

/**
 * Submits one batch of Listing Update calls. It fails closed: with no
 * ELEVENLABS_PHONE_NUMBER_ID (or no API key) nothing is sent to ElevenLabs.
 */
export async function submitListingUpdateBatch(
  rows: CallListRow[],
  { callName, env = process.env, fetchImpl = fetch }: { callName: string; env?: Env; fetchImpl?: typeof fetch },
): Promise<BatchSubmitResult> {
  const agentPhoneNumberId = outboundPhoneNumberId(env);
  if (!agentPhoneNumberId) return configFailure('phone_number_id_missing', { callName });
  const apiKey = (env['ELEVENLABS_API_KEY'] || '').trim();
  if (!apiKey) return configFailure('api_key_missing', { callName });
  if (!rows.length) return { ok: false, reason: 'no_recipients' };

  const body = buildBatchCallRequest(rows, { callName, agentId: agentIds(env).listingUpdate, agentPhoneNumberId });
  try {
    const res = await fetchImpl(ELEVENLABS_BATCH_CALL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.error('outbound_batch_submit_failed', { callName, status: res.status });
      return { ok: false, reason: 'api_error', status: res.status };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    logger.info('outbound_batch_submitted', { callName, recipients: rows.length, batchId: json.id ?? null });
    return { ok: true, batchId: json.id ?? null, recipients: rows.length, agentPhoneNumberId };
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { area: 'elevenlabs-outbound' } });
    return { ok: false, reason: 'api_error' };
  }
}
