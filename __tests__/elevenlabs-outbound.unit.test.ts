/**
 * OL-183 — outbound Listing Update calls present +1 216 677 3569
 * (ELEVENLABS_PHONE_NUMBER_ID) and fail closed when it is unset. fetch is
 * mocked; nothing reaches ElevenLabs.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const logError = jest.fn();
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: (...a: unknown[]) => logError(...a) } }));
const captureError = jest.fn();
jest.mock('@/lib/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { findMany: jest.fn(async () => []) } } }));
jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn(async () => ({ id: 'admin' })) }));

import {
  ELEVENLABS_BATCH_CALL_URL,
  LISTING_UPDATE_CALLER_ID,
  buildBatchCallRequest,
  outboundPhoneNumberId,
  submitListingUpdateBatch,
} from '@/lib/elevenlabs/outbound';
import { DEFAULT_LISTING_UPDATE_AGENT_ID } from '@/lib/elevenlabs/agents';
import { GET as callList } from '@/app/api/admin/availability/call-list/route';

const PHNUM = 'phnum_5301m5qnzd3tejtr4yjej69ph6k6';
const ROWS = [
  { homeId: 'h1', name: 'Maple House', phone: '+12165550101', city: 'Beachwood', reasons: ['directory' as const] },
  { homeId: 'h2', name: 'Oak Manor', phone: '+12165550102', city: 'Lakewood', reasons: ['directory' as const, 'waiver' as const] },
];

function okFetch() {
  return jest.fn(async () => new Response(JSON.stringify({ id: 'batch_1' }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as jest.Mock & typeof fetch;
}

beforeEach(() => jest.clearAllMocks());

describe('caller id', () => {
  it('is +1 216 677 3569', () => expect(LISTING_UPDATE_CALLER_ID).toBe('+12166773569'));
  it('reads ELEVENLABS_PHONE_NUMBER_ID, blank = unset', () => {
    expect(outboundPhoneNumberId({ ELEVENLABS_PHONE_NUMBER_ID: ` ${PHNUM} ` } as NodeJS.ProcessEnv)).toBe(PHNUM);
    expect(outboundPhoneNumberId({ ELEVENLABS_PHONE_NUMBER_ID: '  ' } as NodeJS.ProcessEnv)).toBeNull();
    expect(outboundPhoneNumberId({} as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe('submitListingUpdateBatch', () => {
  const env = { ELEVENLABS_PHONE_NUMBER_ID: PHNUM, ELEVENLABS_API_KEY: 'xi_test' } as NodeJS.ProcessEnv;

  it('set → the request carries agent_phone_number_id, the Listing Update agent and every recipient', async () => {
    const fetchImpl = okFetch();
    const r = await submitListingUpdateBatch(ROWS, { callName: 'availability 2026-W44', env, fetchImpl });
    expect(r).toEqual({ ok: true, batchId: 'batch_1', recipients: 2, agentPhoneNumberId: PHNUM });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ELEVENLABS_BATCH_CALL_URL);
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('xi_test');
    const body = JSON.parse(String(init.body));
    expect(body.agent_phone_number_id).toBe(PHNUM);
    expect(body.agent_id).toBe(DEFAULT_LISTING_UPDATE_AGENT_ID);
    expect(body.recipients).toEqual([
      { phone_number: '+12165550101', conversation_initiation_client_data: { dynamic_variables: { homeId: 'h1', name: 'Maple House', city: 'Beachwood' } } },
      { phone_number: '+12165550102', conversation_initiation_client_data: { dynamic_variables: { homeId: 'h2', name: 'Oak Manor', city: 'Lakewood' } } },
    ]);
  });

  it('unset → no fetch, error logged, config failure returned (never throws)', async () => {
    const fetchImpl = okFetch();
    const r = await submitListingUpdateBatch(ROWS, { callName: 'x', env: { ELEVENLABS_API_KEY: 'xi_test' } as NodeJS.ProcessEnv, fetchImpl });
    expect(r).toEqual({ ok: false, reason: 'phone_number_id_missing' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('outbound_call_not_placed', expect.objectContaining({ reason: 'phone_number_id_missing' }));
    expect(captureError).toHaveBeenCalled();
  });

  it('no API key → no fetch, error logged', async () => {
    const fetchImpl = okFetch();
    const r = await submitListingUpdateBatch(ROWS, { callName: 'x', env: { ELEVENLABS_PHONE_NUMBER_ID: PHNUM } as NodeJS.ProcessEnv, fetchImpl });
    expect(r).toEqual({ ok: false, reason: 'api_key_missing' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('outbound_call_not_placed', expect.objectContaining({ reason: 'api_key_missing' }));
  });

  it('no recipients → no fetch', async () => {
    const fetchImpl = okFetch();
    expect(await submitListingUpdateBatch([], { callName: 'x', env, fetchImpl })).toEqual({ ok: false, reason: 'no_recipients' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ElevenLabs error / network error → api_error, no throw', async () => {
    const bad = jest.fn(async () => new Response('nope', { status: 422 })) as unknown as typeof fetch;
    expect(await submitListingUpdateBatch(ROWS, { callName: 'x', env, fetchImpl: bad })).toEqual({ ok: false, reason: 'api_error', status: 422 });
    const boom = jest.fn(async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch;
    expect(await submitListingUpdateBatch(ROWS, { callName: 'x', env, fetchImpl: boom })).toEqual({ ok: false, reason: 'api_error' });
  });

  it('buildBatchCallRequest is pure', () => {
    const b = buildBatchCallRequest(ROWS.slice(0, 1), { callName: 'n', agentId: 'agent_x', agentPhoneNumberId: PHNUM });
    expect(b).toMatchObject({ call_name: 'n', agent_id: 'agent_x', agent_phone_number_id: PHNUM });
  });
});

describe('/api/admin/availability/call-list reports the caller id', () => {
  const ENV = { ...process.env };
  afterEach(() => { process.env = { ...ENV }; });
  const get = () => callList(new NextRequest('http://localhost/api/admin/availability/call-list?week=2026-W44'));

  it('set → configured with the phone number id', async () => {
    process.env = { ...ENV, ELEVENLABS_PHONE_NUMBER_ID: PHNUM };
    const json = await (await get()).json();
    expect(json.callerId).toEqual({ display: '+1 216 677 3569', phoneNumberId: PHNUM, configured: true });
    expect(logError).not.toHaveBeenCalled();
  });

  it('unset → configured: false and an error is logged', async () => {
    process.env = { ...ENV };
    delete process.env['ELEVENLABS_PHONE_NUMBER_ID'];
    const json = await (await get()).json();
    expect(json.callerId).toEqual({ display: '+1 216 677 3569', phoneNumberId: null, configured: false });
    expect(logError).toHaveBeenCalledWith('outbound_caller_id_missing', expect.objectContaining({ env: 'ELEVENLABS_PHONE_NUMBER_ID' }));
  });
});
