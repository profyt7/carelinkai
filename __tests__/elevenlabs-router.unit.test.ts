/**
 * OL-180 — the single ElevenLabs post-call webhook (/api/webhooks/elevenlabs).
 *  - verifies the HMAC once: 503 without ELEVENLABS_WEBHOOK_SECRET, 401 on a bad signature;
 *  - Front Desk agent → inbound-lead (data-collection fields mapped exactly as
 *    ElevenLabs sends them: caller_type, caller_name, organization,
 *    callback_phone, urgency, reason);
 *  - Listing Update agent → call-result;
 *  - unknown agent → homeId ⇒ call-result, else inbound-lead;
 *  - an empty callback_phone falls back to system__caller_id;
 *  - the two older routes still work.
 * The DB writers are mocked; parsing, mapping and dispatch are the real code.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const recordInboundLead = jest.fn<(...a: any[]) => Promise<any>>();
const recordCallResult = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ guardedResendSend: jest.fn() }));
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendSMS: jest.fn(), isConfigured: () => false } }));
jest.mock('@/lib/leads/inbound-lead', () => ({
  ...(jest.requireActual('@/lib/leads/inbound-lead') as object),
  recordInboundLead: (...a: unknown[]) => recordInboundLead(...a),
}));
jest.mock('@/lib/availability/call-result', () => ({
  ...(jest.requireActual('@/lib/availability/call-result') as object),
  recordCallResult: (...a: unknown[]) => recordCallResult(...a),
}));

import { signElevenLabsPayload, ELEVENLABS_SIGNATURE_HEADER } from '@/lib/availability/call-result';
import { DEFAULT_FRONT_DESK_AGENT_ID, DEFAULT_LISTING_UPDATE_AGENT_ID, routePostCall } from '@/lib/elevenlabs/post-call';
import { POST as router } from '@/app/api/webhooks/elevenlabs/route';
import { POST as inboundLeadRoute } from '@/app/api/webhooks/elevenlabs/inbound-lead/route';
import { POST as callResultRoute } from '@/app/api/webhooks/elevenlabs/call-result/route';

const SECRET = 'whsec_test_router';
const FRONT_DESK = 'agent_6101m5e81ahffwg9byc0jzw48rpw';
const LISTING_UPDATE = 'agent_4201m5cre84af80r71nj41g1n603';

/** A post_call_transcription envelope as ElevenLabs sends it. */
function envelope(opts: { agentId: string; conv: string; results?: Record<string, unknown>; dyn?: Record<string, unknown>; externalNumber?: string }) {
  return {
    type: 'post_call_transcription',
    event_timestamp: 1792860000,
    data: {
      agent_id: opts.agentId,
      conversation_id: opts.conv,
      status: 'done',
      transcript: [{ role: 'agent', message: 'Hi', time_in_call_secs: 0 }],
      metadata: { start_time_unix_secs: 1792860000, ...(opts.externalNumber ? { phone_call: { external_number: opts.externalNumber } } : {}) },
      analysis: { data_collection_results: Object.fromEntries(Object.entries(opts.results ?? {}).map(([k, v]) => [k, { data_collection_id: k, value: v }])) },
      conversation_initiation_client_data: { dynamic_variables: opts.dyn ?? {} },
    },
  };
}

const frontDeskCall = (results: Record<string, unknown>, dyn: Record<string, unknown> = { system__caller_id: '+12165550177' }) =>
  envelope({ agentId: FRONT_DESK, conv: 'conv_fd_1', results, dyn });
const listingUpdateCall = () =>
  envelope({ agentId: LISTING_UPDATE, conv: 'conv_lu_1', dyn: { homeId: 'home_123' }, results: { outcome: 'reached', beds_available: 2 } });

const req = (path: string, body: unknown, secret: string | null = SECRET) => {
  const raw = JSON.stringify(body);
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: raw,
    headers: { 'content-type': 'application/json', ...(secret ? { [ELEVENLABS_SIGNATURE_HEADER]: signElevenLabsPayload(secret, raw) } : {}) },
  });
};

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV, ELEVENLABS_WEBHOOK_SECRET: SECRET };
  delete process.env['ELEVENLABS_AGENT_ID_FRONT_DESK'];
  delete process.env['ELEVENLABS_AGENT_ID_LISTING_UPDATE'];
  recordInboundLead.mockResolvedValue({ status: 'created', lane: 'lead', leadId: 'lead_1', callerType: 'PLANNER' });
  recordCallResult.mockResolvedValue({ status: 'created', observationId: 'obs_1' });
});
afterAll(() => {
  process.env = ENV;
});

describe('routePostCall (pure)', () => {
  it('defaults are the two current agents', () => {
    expect(DEFAULT_FRONT_DESK_AGENT_ID).toBe(FRONT_DESK);
    expect(DEFAULT_LISTING_UPDATE_AGENT_ID).toBe(LISTING_UPDATE);
  });
  it('dispatches by agent_id, env names override the defaults', () => {
    expect(routePostCall(frontDeskCall({}))).toEqual({ route: 'inbound-lead', reason: 'front_desk_agent' });
    expect(routePostCall(listingUpdateCall())).toEqual({ route: 'call-result', reason: 'listing_update_agent' });
    const env = { ELEVENLABS_AGENT_ID_FRONT_DESK: 'agent_new_fd', ELEVENLABS_AGENT_ID_LISTING_UPDATE: 'agent_new_lu' } as unknown as NodeJS.ProcessEnv;
    expect(routePostCall(envelope({ agentId: 'agent_new_fd', conv: 'c', dyn: { homeId: 'h' } }), env).route).toBe('inbound-lead');
    expect(routePostCall(envelope({ agentId: 'agent_new_lu', conv: 'c' }), env).route).toBe('call-result');
  });
  it('unknown agent: homeId ⇒ call-result, otherwise inbound-lead', () => {
    expect(routePostCall(envelope({ agentId: 'agent_other', conv: 'c', dyn: { homeId: 'home_9' } }))).toEqual({ route: 'call-result', reason: 'fallback_home_id' });
    expect(routePostCall(envelope({ agentId: 'agent_other', conv: 'c', results: { home_id: 'home_9' } }))).toEqual({ route: 'call-result', reason: 'fallback_home_id' });
    expect(routePostCall(envelope({ agentId: 'agent_other', conv: 'c' }))).toEqual({ route: 'inbound-lead', reason: 'fallback_no_home_id' });
    expect(routePostCall({})).toEqual({ route: 'inbound-lead', reason: 'fallback_no_home_id' });
  });
});

describe('POST /api/webhooks/elevenlabs', () => {
  it('503 when ELEVENLABS_WEBHOOK_SECRET is unset; 401 on a bad signature; nothing recorded', async () => {
    delete process.env['ELEVENLABS_WEBHOOK_SECRET'];
    expect((await router(req('/api/webhooks/elevenlabs', listingUpdateCall()))).status).toBe(503);
    process.env['ELEVENLABS_WEBHOOK_SECRET'] = SECRET;
    expect((await router(req('/api/webhooks/elevenlabs', listingUpdateCall(), 'wrong-secret'))).status).toBe(401);
    expect((await router(req('/api/webhooks/elevenlabs', listingUpdateCall(), null))).status).toBe(401);
    expect(recordInboundLead).not.toHaveBeenCalled();
    expect(recordCallResult).not.toHaveBeenCalled();
  });

  it('Front Desk → inbound-lead with the data-collection fields mapped exactly', async () => {
    const r = await router(
      req('/api/webhooks/elevenlabs', frontDeskCall({ caller_type: 'planner', caller_name: 'Pat Example', organization: 'MetroHealth', callback_phone: '(216) 555-0199', urgency: 'today', reason: 'needs a bed this week' })),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get('x-carelink-post-call-route')).toBe('inbound-lead;front_desk_agent');
    expect(await r.json()).toMatchObject({ ok: true, lane: 'lead', leadId: 'lead_1' });
    expect(recordCallResult).not.toHaveBeenCalled();
    expect(recordInboundLead.mock.calls[0]![0]).toMatchObject({
      conversationId: 'conv_fd_1',
      agentId: FRONT_DESK,
      callerType: 'planner',
      name: 'Pat Example',
      organization: 'MetroHealth',
      callbackPhone: '+12165550199',
      urgency: 'today',
      reason: 'needs a bed this week',
    });
  });

  it('Front Desk with an empty callback_phone falls back to system__caller_id', async () => {
    const r = await router(req('/api/webhooks/elevenlabs', frontDeskCall({ caller_type: 'family', caller_name: 'Jordan', callback_phone: '', urgency: 'this week' })));
    expect(r.status).toBe(200);
    expect(recordInboundLead.mock.calls[0]![0]).toMatchObject({ callerType: 'family', callbackPhone: '+12165550177', fromNumber: '+12165550177', urgency: 'this_week' });
  });

  it('Listing Update → call-result', async () => {
    const r = await router(req('/api/webhooks/elevenlabs', listingUpdateCall()));
    expect(r.status).toBe(200);
    expect(r.headers.get('x-carelink-post-call-route')).toBe('call-result;listing_update_agent');
    expect(await r.json()).toMatchObject({ ok: true, observationId: 'obs_1', qaStatus: 'pending' });
    expect(recordInboundLead).not.toHaveBeenCalled();
    expect(recordCallResult.mock.calls[0]![0]).toMatchObject({ conversationId: 'conv_lu_1', homeId: 'home_123', agentId: LISTING_UPDATE });
  });

  it('unknown agent falls back on the homeId', async () => {
    const withHome = await router(req('/api/webhooks/elevenlabs', envelope({ agentId: 'agent_unknown', conv: 'conv_u1', dyn: { homeId: 'home_7' } })));
    expect(withHome.headers.get('x-carelink-post-call-route')).toBe('call-result;fallback_home_id');
    expect(recordCallResult).toHaveBeenCalledTimes(1);
    const noHome = await router(req('/api/webhooks/elevenlabs', envelope({ agentId: 'agent_unknown', conv: 'conv_u2', results: { caller_type: 'other', callback_phone: '2165550100' } })));
    expect(noHome.headers.get('x-carelink-post-call-route')).toBe('inbound-lead;fallback_no_home_id');
    expect(recordInboundLead).toHaveBeenCalledTimes(1);
  });
});

describe('the older per-purpose routes keep working', () => {
  it('/inbound-lead and /call-result verify and handle their own payloads', async () => {
    expect((await inboundLeadRoute(req('/api/webhooks/elevenlabs/inbound-lead', frontDeskCall({ caller_type: 'planner', callback_phone: '2165550199' })))).status).toBe(200);
    expect(recordInboundLead).toHaveBeenCalledTimes(1);
    expect((await callResultRoute(req('/api/webhooks/elevenlabs/call-result', listingUpdateCall()))).status).toBe(200);
    expect(recordCallResult).toHaveBeenCalledTimes(1);
    delete process.env['ELEVENLABS_WEBHOOK_SECRET'];
    expect((await inboundLeadRoute(req('/api/webhooks/elevenlabs/inbound-lead', frontDeskCall({})))).status).toBe(503);
    expect((await callResultRoute(req('/api/webhooks/elevenlabs/call-result', listingUpdateCall()))).status).toBe(503);
  });
});
