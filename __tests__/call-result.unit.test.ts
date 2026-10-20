/**
 * OL-163a — ElevenLabs call-result webhook:
 *  - HMAC signature: valid / wrong secret / tampered body / stale timestamp / malformed;
 *  - parse: the ElevenLabs post_call_transcription envelope and a flat payload →
 *    normalized observation; outcome inferred when the agent did not collect one;
 *  - route: 503 without the secret, 401 on a bad signature, 400 on bad JSON /
 *    missing homeId, 200 + observation on success, 200 duplicate on redelivery
 *    (nothing written), 200 ignored for an unknown home.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => {
  const p: any = {
    availabilityObservation: { findUnique: jest.fn(), create: jest.fn() },
    assistedLivingHome: { findUnique: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { prisma } from '@/lib/prisma';
import {
  ELEVENLABS_SIGNATURE_HEADER,
  SIGNATURE_TOLERANCE_SECS,
  inferOutcome,
  parseCallResult,
  recordCallResult,
  signElevenLabsPayload,
  verifyElevenLabsSignature,
} from '@/lib/availability/call-result';
import { POST } from '@/app/api/webhooks/elevenlabs/call-result/route';

const SECRET = 'whsec_test_secret_value';
const NOW = 1_760_000_000; // unix secs

const obsFind = (prisma as any).availabilityObservation.findUnique as jest.Mock;
const obsCreate = (prisma as any).availabilityObservation.create as jest.Mock;
const homeFind = (prisma as any).assistedLivingHome.findUnique as jest.Mock;
const evtCreate = (prisma as any).entityEvent.create as jest.Mock;

const envelope = (overrides: Record<string, unknown> = {}, results: Record<string, unknown> = {}) => ({
  type: 'post_call_transcription',
  event_timestamp: NOW,
  data: {
    agent_id: 'agent_4201m5cre84af80r71nj41g1n603',
    conversation_id: 'conv_abc123',
    status: 'done',
    transcript: [
      { role: 'agent', message: 'Hi, this is an automated assistant calling on behalf of CareLinkAI…', time_in_call_secs: 0 },
      { role: 'user', message: 'Sure, go ahead.', time_in_call_secs: 6 },
      { role: 'agent', message: 'Do you have any open assisted-living or memory-care apartments this week?', time_in_call_secs: 8 },
      { role: 'user', message: 'We have two assisted living and one memory care. Starting price is forty-two hundred.', time_in_call_secs: 14 },
    ],
    metadata: { start_time_unix_secs: NOW - 120, call_duration_secs: 95 },
    analysis: {
      call_successful: 'success',
      transcript_summary: 'Two AL and one MC open; AL from $4,200; accepts waiver for current residents only.',
      data_collection_results: {
        outcome: { value: 'answered', rationale: 'They answered all three questions.' },
        bedsAL: { value: 2 },
        bedsMC: { value: '1' },
        priceFromMonthly: { value: '$4,200' },
        priceUndisclosed: { value: false },
        waiverStatus: { value: 'current_only' },
        medicaidPending: { value: 'case by case' },
        contactRole: { value: 'admissions director' },
        confidence: { value: 0.86 },
        ...results,
      },
    },
    conversation_initiation_client_data: { dynamic_variables: { homeId: 'home_1', facilityName: 'Maple Grove' } },
    ...overrides,
  },
});

describe('verifyElevenLabsSignature', () => {
  const body = JSON.stringify({ hello: 'world' });
  it('accepts a header signed with the secret over "<t>.<body>"', () => {
    const header = signElevenLabsPayload(SECRET, body, NOW);
    expect(header).toMatch(/^t=\d+,v0=[0-9a-f]{64}$/);
    expect(verifyElevenLabsSignature({ secret: SECRET, header, rawBody: body, nowSecs: NOW })).toEqual({ ok: true });
  });
  it('rejects the wrong secret, a tampered body, a stale timestamp and malformed headers', () => {
    const header = signElevenLabsPayload(SECRET, body, NOW);
    expect(verifyElevenLabsSignature({ secret: 'other', header, rawBody: body, nowSecs: NOW })).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyElevenLabsSignature({ secret: SECRET, header, rawBody: body + ' ', nowSecs: NOW })).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyElevenLabsSignature({ secret: SECRET, header, rawBody: body, nowSecs: NOW + SIGNATURE_TOLERANCE_SECS + 1 })).toEqual({ ok: false, reason: 'stale_timestamp' });
    expect(verifyElevenLabsSignature({ secret: SECRET, header: 'v0=abc', rawBody: body, nowSecs: NOW })).toEqual({ ok: false, reason: 'malformed_header' });
    expect(verifyElevenLabsSignature({ secret: SECRET, header: `t=${NOW},v0=zz`, rawBody: body, nowSecs: NOW })).toEqual({ ok: false, reason: 'malformed_header' });
    expect(verifyElevenLabsSignature({ secret: SECRET, header: null, rawBody: body, nowSecs: NOW })).toEqual({ ok: false, reason: 'missing_header' });
    expect(verifyElevenLabsSignature({ secret: '', header, rawBody: body, nowSecs: NOW })).toEqual({ ok: false, reason: 'no_secret' });
  });
});

describe('parseCallResult', () => {
  it('maps the ElevenLabs envelope: ids, calledAt from metadata, collected fields normalized', () => {
    const r = parseCallResult(envelope());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      conversationId: 'conv_abc123',
      agentId: 'agent_4201m5cre84af80r71nj41g1n603',
      homeId: 'home_1',
      durationSecs: 95,
      outcome: 'answered',
      bedsAL: 2,
      bedsMC: 1,
      priceFromMonthly: 4200,
      priceUndisclosed: false,
      waiverStatus: 'current_only',
      medicaidPending: 'case_by_case',
      doNotCall: false,
      contactRole: 'admissions director',
      confidence: 0.86,
      transcriptUrl: 'https://elevenlabs.io/app/conversational-ai/history/conv_abc123',
      recordingUrl: 'https://api.elevenlabs.io/v1/convai/conversations/conv_abc123/audio',
    });
    expect(r.value.calledAt.toISOString()).toBe(new Date((NOW - 120) * 1000).toISOString());
    expect(r.value.transcript).toHaveLength(4);
    expect(r.value.transcript?.[1]).toEqual({ role: 'user', message: 'Sure, go ahead.', timeSecs: 6 });
    expect(r.value.notes).toMatch(/Two AL and one MC open/);
  });

  it('accepts a flat payload and explicit links; do_not_call + wrong_number are kept', () => {
    const r = parseCallResult({
      conversation_id: 'conv_flat',
      homeId: 'home_9',
      calledAt: '2026-10-21T15:00:00.000Z',
      outcome: 'wrong_number',
      do_not_call: 'yes',
      transcript_url: 'https://example.com/t',
      recording_url: 'https://example.com/r',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ conversationId: 'conv_flat', homeId: 'home_9', outcome: 'wrong_number', doNotCall: true, transcriptUrl: 'https://example.com/t', recordingUrl: 'https://example.com/r', bedsAL: null, waiverStatus: null });
    expect(r.value.calledAt.toISOString()).toBe('2026-10-21T15:00:00.000Z');
  });

  it('infers the outcome when the agent collected none: no user turn → no_answer, otherwise answered', () => {
    const silent = envelope({ transcript: [{ role: 'agent', message: 'Hi…' }] }, { outcome: { value: '' } });
    const r1 = parseCallResult(silent);
    expect(r1.ok && r1.value.outcome).toBe('no_answer');
    const r2 = parseCallResult(envelope({}, { outcome: { value: null } }));
    expect(r2.ok && r2.value.outcome).toBe('answered');
    expect(inferOutcome(null, 'failed')).toBe('no_answer');
    expect(inferOutcome([{ role: 'user', message: 'hello' }], 'done')).toBe('answered');
  });

  it('rejects a payload without conversation_id or homeId', () => {
    expect(parseCallResult({ data: { homeId: 'x' } })).toEqual({ ok: false, error: 'conversation_id required' });
    const noHome = envelope({ conversation_initiation_client_data: {} }, { homeId: { value: '' } });
    expect(parseCallResult(noHome).ok).toBe(false);
    expect(parseCallResult('nope').ok).toBe(false);
  });

  it('normalizes the waiver / pending vocabularies and clamps numbers', () => {
    const r = parseCallResult(envelope({}, { waiverStatus: { value: 'Accepting new' }, medicaidPending: { value: 'Yes' }, bedsAL: { value: -4 }, confidence: { value: 92 } }));
    expect(r.ok && r.value).toMatchObject({ waiverStatus: 'accepting_new', medicaidPending: 'yes', bedsAL: 0, confidence: 0.92 });
  });
});

describe('POST /api/webhooks/elevenlabs/call-result', () => {
  const ORIGINAL = process.env['ELEVENLABS_WEBHOOK_SECRET'];
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['ELEVENLABS_WEBHOOK_SECRET'] = SECRET;
    obsFind.mockResolvedValue(null);
    homeFind.mockResolvedValue({ id: 'home_1' });
    obsCreate.mockResolvedValue({ id: 'obs_1' });
  });
  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env['ELEVENLABS_WEBHOOK_SECRET'];
    else process.env['ELEVENLABS_WEBHOOK_SECRET'] = ORIGINAL;
  });

  const post = (payload: unknown, opts: { secret?: string; header?: string | null } = {}) => {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const header = opts.header === undefined ? signElevenLabsPayload(opts.secret ?? SECRET, raw) : opts.header;
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (header) headers[ELEVENLABS_SIGNATURE_HEADER] = header;
    return POST(new NextRequest('http://localhost/api/webhooks/elevenlabs/call-result', { method: 'POST', headers, body: raw }));
  };

  it('fails closed without the secret (503) and on a bad signature (401); nothing is written', async () => {
    delete process.env['ELEVENLABS_WEBHOOK_SECRET'];
    expect((await post(envelope())).status).toBe(503);
    process.env['ELEVENLABS_WEBHOOK_SECRET'] = SECRET;
    expect((await post(envelope(), { secret: 'wrong' })).status).toBe(401);
    expect((await post(envelope(), { header: null })).status).toBe(401);
    expect(obsCreate).not.toHaveBeenCalled();
  });

  it('creates the pending observation + a history row (source AI_CALL, no transcript text in the event)', async () => {
    const res = await post(envelope());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, observationId: 'obs_1', duplicate: false, qaStatus: 'pending' });
    expect(obsCreate).toHaveBeenCalledTimes(1);
    const data = obsCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({ homeId: 'home_1', source: 'AI_CALL', conversationId: 'conv_abc123', outcome: 'ANSWERED', bedsAL: 2, bedsMC: 1, priceFromMonthly: 4200, waiverStatus: 'CURRENT_ONLY', medicaidPending: 'CASE_BY_CASE', qaStatus: 'PENDING', doNotCall: false });
    expect(Array.isArray(data.transcript)).toBe(true);
    expect(evtCreate).toHaveBeenCalledTimes(1);
    const evt = evtCreate.mock.calls[0][0].data;
    expect(evt).toMatchObject({ entityType: 'AVAILABILITY', entityId: 'home_1', eventType: 'call.observed', source: 'AI_CALL' });
    expect(evt.newValue).toMatchObject({ observationId: 'obs_1', outcome: 'answered', bedsAL: 2, qaStatus: 'pending', confidence: 0.86 });
    expect(JSON.stringify(evt.newValue)).not.toContain('Sure, go ahead');
  });

  it('is idempotent on conversation_id: a redelivery returns the existing row and writes nothing', async () => {
    obsFind.mockResolvedValue({ id: 'obs_existing' });
    const res = await post(envelope());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, observationId: 'obs_existing', duplicate: true });
    expect(obsCreate).not.toHaveBeenCalled();
    expect(evtCreate).not.toHaveBeenCalled();
  });

  it('handles the unique-index race (P2002) as a duplicate', async () => {
    obsFind.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'obs_raced' });
    obsCreate.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    const r = await recordCallResult((parseCallResult(envelope()) as any).value);
    expect(r).toEqual({ status: 'duplicate', observationId: 'obs_raced' });
  });

  it('400 on bad JSON / missing homeId; 200 ignored for an unknown home; non-call events acknowledged', async () => {
    expect((await post('{not json')).status).toBe(400);
    expect((await post({ data: { conversation_id: 'c1' } })).status).toBe(400);
    homeFind.mockResolvedValue(null);
    const unknown = await post(envelope());
    expect(unknown.status).toBe(200);
    expect(await unknown.json()).toMatchObject({ ok: false, ignored: 'unknown_home' });
    expect(obsCreate).not.toHaveBeenCalled();
    const other = await post({ type: 'post_call_audio', data: { conversation_id: 'c2' } });
    expect(other.status).toBe(200);
    expect(await other.json()).toEqual({ ok: true, ignored: 'post_call_audio' });
  });
});
