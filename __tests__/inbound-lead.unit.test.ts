/**
 * OL-167a — inbound calls to the published number:
 *  - the route reuses the call-result HMAC verifier (503 no secret, 401 bad /
 *    stale signature, 400 bad body);
 *  - ElevenLabs data-collection fields map onto the lead; urgency / caller
 *    type vocabularies normalize; after-hours flag (Mon–Fri 8–6 ET);
 *  - PHI guard: a reason that looks like patient detail is replaced with the
 *    marker and phiFlag is set; a plain business reason passes through;
 *  - lane routing: PLANNER / FAMILY / OTHER → InboundLead; FACILITY matched by
 *    the caller's number → AvailabilityObservation (AI_CALL_INBOUND, pending);
 *    unmatched FACILITY → InboundLead with the "unmatched facility update" reason;
 *  - idempotent on conversation_id across both tables (incl. the unique race).
 * Nothing is sent, nothing is stored — prisma is mocked.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => {
  const p: any = {
    inboundLead: { findUnique: jest.fn(), create: jest.fn() },
    availabilityObservation: { findUnique: jest.fn(), create: jest.fn() },
    assistedLivingHome: { findMany: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { prisma } from '@/lib/prisma';
import { signElevenLabsPayload, ELEVENLABS_SIGNATURE_HEADER } from '@/lib/availability/call-result';
import { guardFreeText, looksLikePhi, PHI_REDACTED } from '@/lib/phi-guard';
import { isAfterHours, normalizeCallerType, normalizeUrgency, parseInboundLead, recordInboundLead, UNMATCHED_FACILITY_REASON } from '@/lib/leads/inbound-lead';
import { POST } from '@/app/api/webhooks/elevenlabs/inbound-lead/route';

const SECRET = 'whsec_unit_inbound';
const NOW = 1_761_000_000; // unix secs

const leadFind = (prisma as any).inboundLead.findUnique as jest.Mock;
const leadCreate = (prisma as any).inboundLead.create as jest.Mock;
const obsFind = (prisma as any).availabilityObservation.findUnique as jest.Mock;
const obsCreate = (prisma as any).availabilityObservation.create as jest.Mock;
const homesFind = (prisma as any).assistedLivingHome.findMany as jest.Mock;
const evtCreate = (prisma as any).entityEvent.create as jest.Mock;

const envelope = (results: Record<string, unknown> = {}, over: Record<string, unknown> = {}) => ({
  type: 'post_call_transcription',
  event_timestamp: NOW,
  data: {
    agent_id: 'agent_frontdesk',
    conversation_id: 'conv_in_1',
    status: 'done',
    metadata: { start_time_unix_secs: NOW - 60, call_duration_secs: 55, phone_call: { direction: 'inbound', external_number: '+12165550111', agent_number: '+12162459482' } },
    analysis: {
      data_collection_results: Object.fromEntries(
        Object.entries({
          caller_type: 'Discharge planner',
          caller_name: 'Pat Example',
          organization: 'MetroHealth',
          callback_phone: '(216) 555-0199',
          urgency: 'Today',
          reason: 'needs memory care placement by Friday',
          ...results,
        }).map(([k, v]) => [k, { value: v }]),
      ),
    },
    ...over,
  },
});

function req(body: unknown, opts: { secret?: string; header?: string | null; t?: number } = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const header = opts.header === undefined ? signElevenLabsPayload(opts.secret ?? SECRET, raw, opts.t ?? Math.floor(Date.now() / 1000)) : opts.header;
  if (header) headers[ELEVENLABS_SIGNATURE_HEADER] = header;
  return new NextRequest('http://localhost/api/webhooks/elevenlabs/inbound-lead', { method: 'POST', body: raw, headers });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env['ELEVENLABS_WEBHOOK_SECRET'] = SECRET;
  leadFind.mockResolvedValue(null);
  obsFind.mockResolvedValue(null);
  homesFind.mockResolvedValue([]);
  leadCreate.mockImplementation(async (args: any) => ({ id: 'lead_1', ...args.data }));
  obsCreate.mockImplementation(async (args: any) => ({ id: 'obs_1', ...args.data }));
});

describe('phi-guard', () => {
  it('flags and redacts anything that looks like patient detail', () => {
    for (const t of ['DOB 04/12/1941', 'date of birth is March 3', 'MRN 4455', 'diagnosed with dementia', 'Medicaid ID 123', 'her SSN is 123-45-6789', 'ref 123456789', 'dx F03.90']) {
      expect({ t, phi: looksLikePhi(t) }).toEqual({ t, phi: true });
      expect(guardFreeText(t)).toMatchObject({ text: PHI_REDACTED, flagged: true });
    }
  });
  it('passes a plain business reason through, capped at 280 chars', () => {
    const r = guardFreeText('needs memory care placement by Friday, Westlake area');
    expect(r).toMatchObject({ text: 'needs memory care placement by Friday, Westlake area', flagged: false });
    expect(guardFreeText('x'.repeat(400)).text).toHaveLength(280);
    expect(guardFreeText('   ')).toEqual({ text: null, flagged: false, matched: [] });
    expect(looksLikePhi('call back after 3pm, 216 area code')).toBe(false);
  });
});

describe('parseInboundLead', () => {
  it('maps the ElevenLabs data-collection fields, normalizes vocab, E.164 callback, after-hours', () => {
    const r = parseInboundLead(envelope());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      conversationId: 'conv_in_1',
      callerType: 'planner',
      name: 'Pat Example',
      organization: 'MetroHealth',
      callbackPhone: '+12165550199',
      fromNumber: '+12165550111',
      urgency: 'today',
      reason: 'needs memory care placement by Friday',
      phiFlag: false,
    });
    expect(r.value.receivedAt.getTime()).toBe((NOW - 60) * 1000);
    expect(r.value.transcriptUrl).toContain('conv_in_1');
  });
  it('vocabularies', () => {
    expect(normalizeCallerType('family member')).toBe('family');
    expect(normalizeCallerType('Social worker')).toBe('planner');
    expect(normalizeCallerType('Community')).toBe('facility');
    expect(normalizeCallerType('???')).toBe('other');
    expect(normalizeUrgency('ASAP')).toBe('today');
    expect(normalizeUrgency('this week')).toBe('this_week');
    expect(normalizeUrgency('just researching')).toBeNull();
    expect(normalizeUrgency('planning')).toBe('planning');
  });
  it('callback falls back to the number the call came from; neither → null', () => {
    const r = parseInboundLead(envelope({ callback_phone: '' }));
    expect(r.ok && r.value.callbackPhone).toBe('+12165550111');
    const r2 = parseInboundLead(envelope({ callback_phone: 'no idea' }, { metadata: { start_time_unix_secs: NOW } }));
    expect(r2.ok && r2.value.callbackPhone).toBeNull();
  });
  it('after-hours: Mon–Fri 8–6 ET is business time, everything else is after hours', () => {
    expect(isAfterHours(new Date('2026-10-21T14:00:00Z'))).toBe(false); // Wed 10:00 ET
    expect(isAfterHours(new Date('2026-10-21T23:30:00Z'))).toBe(true); // Wed 19:30 ET
    expect(isAfterHours(new Date('2026-10-21T11:30:00Z'))).toBe(true); // Wed 07:30 ET
    expect(isAfterHours(new Date('2026-10-24T15:00:00Z'))).toBe(true); // Sat
  });
  it('PHI in the reason → marker + phiFlag', () => {
    const r = parseInboundLead(envelope({ reason: 'mom DOB 1/2/1940 diagnosed with COPD' }));
    expect(r.ok && r.value.reason).toBe(PHI_REDACTED);
    expect(r.ok && r.value.phiFlag).toBe(true);
  });
  it('rejects a body without conversation_id', () => {
    expect(parseInboundLead({ data: {} })).toEqual({ ok: false, error: 'conversation_id required' });
    expect(parseInboundLead('nope').ok).toBe(false);
  });
});

describe('recordInboundLead — lanes + idempotency', () => {
  it('PLANNER → InboundLead NEW with a lead.received event carrying business facts only', async () => {
    const p = parseInboundLead(envelope());
    if (!p.ok) throw new Error('parse');
    const r = await recordInboundLead(p.value);
    expect(r).toMatchObject({ status: 'created', lane: 'lead', leadId: 'lead_1', callerType: 'PLANNER' });
    expect(leadCreate.mock.calls[0][0].data).toMatchObject({
      conversationId: 'conv_in_1',
      callerType: 'PLANNER',
      name: 'Pat Example',
      organization: 'MetroHealth',
      callbackPhone: '+12165550199',
      urgency: 'TODAY',
      reason: 'needs memory care placement by Friday',
      status: 'NEW',
      phiFlag: false,
    });
    const evt = evtCreate.mock.calls[0][0].data;
    expect(evt.entityType).toBe('INBOUND_LEAD');
    expect(evt.eventType).toBe('lead.received');
    expect(JSON.stringify(evt.newValue)).not.toMatch(/Pat Example|MetroHealth|555/);
    expect(evt.newValue).toMatchObject({ callerType: 'planner', urgency: 'today', phiFlag: false });
    expect(obsCreate).not.toHaveBeenCalled();
  });

  it('FAMILY and OTHER → InboundLead; PHI reason stored redacted with phiFlag', async () => {
    const fam = parseInboundLead(envelope({ caller_type: 'daughter', reason: 'dad, MRN 998877, needs a bed' }));
    if (!fam.ok) throw new Error('parse');
    const r = await recordInboundLead(fam.value);
    expect(r).toMatchObject({ lane: 'lead', callerType: 'FAMILY' });
    expect(leadCreate.mock.calls[0][0].data).toMatchObject({ reason: PHI_REDACTED, phiFlag: true });
    jest.clearAllMocks();
    leadCreate.mockImplementation(async (args: any) => ({ id: 'lead_2', ...args.data }));
    const oth = parseInboundLead(envelope({ caller_type: 'vendor' }));
    if (!oth.ok) throw new Error('parse');
    expect(await recordInboundLead(oth.value)).toMatchObject({ lane: 'lead', callerType: 'OTHER', leadId: 'lead_2' });
  });

  it('FACILITY matched by the caller number → AvailabilityObservation AI_CALL_INBOUND pending with the three OL-163a facts', async () => {
    homesFind.mockResolvedValue([
      { id: 'home_other', phone: '(216) 555-9111' },
      { id: 'home_hit', phone: '216-555-0111' },
    ]);
    const p = parseInboundLead(envelope({ caller_type: 'facility', caller_name: 'Admissions', beds_available: '3', starting_price: '$4,500', medicaid_waiver: 'current residents only' }));
    if (!p.ok) throw new Error('parse');
    const r = await recordInboundLead(p.value);
    expect(r).toMatchObject({ status: 'created', lane: 'observation', observationId: 'obs_1', homeId: 'home_hit' });
    expect(obsCreate.mock.calls[0][0].data).toMatchObject({
      homeId: 'home_hit',
      source: 'AI_CALL_INBOUND',
      conversationId: 'conv_in_1',
      outcome: 'ANSWERED',
      bedsAL: 3,
      priceFromMonthly: 4500,
      waiverStatus: 'CURRENT_ONLY',
      qaStatus: 'PENDING',
    });
    expect(leadCreate).not.toHaveBeenCalled();
    expect(evtCreate.mock.calls[0][0].data).toMatchObject({ entityType: 'AVAILABILITY', eventType: 'call.observed', source: 'AI_CALL' });
  });

  it('FACILITY with no matching home → InboundLead FACILITY "unmatched facility update"', async () => {
    homesFind.mockResolvedValue([{ id: 'home_other', phone: '(216) 555-9111' }]);
    const p = parseInboundLead(envelope({ caller_type: 'facility', reason: 'we have two beds open' }));
    if (!p.ok) throw new Error('parse');
    const r = await recordInboundLead(p.value);
    expect(r).toMatchObject({ lane: 'lead', callerType: 'FACILITY' });
    expect(leadCreate.mock.calls[0][0].data).toMatchObject({ callerType: 'FACILITY', reason: UNMATCHED_FACILITY_REASON, callbackPhone: '+12165550199' });
    expect(obsCreate).not.toHaveBeenCalled();
  });

  it('idempotent: an existing lead or observation with the conversation id → duplicate, nothing written; the unique race resolves the same way', async () => {
    leadFind.mockResolvedValue({ id: 'lead_existing' });
    const p = parseInboundLead(envelope());
    if (!p.ok) throw new Error('parse');
    expect(await recordInboundLead(p.value)).toEqual({ status: 'duplicate', lane: 'lead', leadId: 'lead_existing' });
    leadFind.mockResolvedValue(null);
    obsFind.mockResolvedValue({ id: 'obs_existing' });
    expect(await recordInboundLead(p.value)).toEqual({ status: 'duplicate', lane: 'observation', observationId: 'obs_existing' });
    expect(leadCreate).not.toHaveBeenCalled();
    expect(obsCreate).not.toHaveBeenCalled();
    // Race: findUnique says none, create throws unique, re-read finds the row.
    obsFind.mockResolvedValue(null);
    leadFind.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'lead_raced' });
    leadCreate.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await recordInboundLead(p.value)).toEqual({ status: 'duplicate', lane: 'lead', leadId: 'lead_raced' });
  });

  it('no callback number at all → invalid (nothing written)', async () => {
    const p = parseInboundLead(envelope({ callback_phone: 'unknown' }, { metadata: { start_time_unix_secs: NOW } }));
    if (!p.ok) throw new Error('parse');
    expect(await recordInboundLead(p.value)).toEqual({ status: 'invalid', error: 'callback_phone_required' });
    expect(leadCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/elevenlabs/inbound-lead', () => {
  it('503 when the secret is unset; 401 on a bad or stale signature; nothing written', async () => {
    delete process.env['ELEVENLABS_WEBHOOK_SECRET'];
    expect((await POST(req(envelope()))).status).toBe(503);
    process.env['ELEVENLABS_WEBHOOK_SECRET'] = SECRET;
    expect((await POST(req(envelope(), { secret: 'wrong' }))).status).toBe(401);
    expect((await POST(req(envelope(), { header: null }))).status).toBe(401);
    expect((await POST(req(envelope(), { t: Math.floor(Date.now() / 1000) - 3 * 3600 }))).status).toBe(401);
    expect(leadCreate).not.toHaveBeenCalled();
  });
  it('400 on bad JSON / missing conversation id; other event types acknowledged', async () => {
    expect((await POST(req('{not json'))).status).toBe(400);
    expect((await POST(req({ type: 'post_call_transcription', data: {} }))).status).toBe(400);
    const other = await POST(req({ type: 'conversation_started', data: { conversation_id: 'x' } }));
    expect(other.status).toBe(200);
    expect(await other.json()).toEqual({ ok: true, ignored: 'conversation_started' });
    expect(leadCreate).not.toHaveBeenCalled();
  });
  it('200 { lane: lead } on a planner call, { duplicate: true } on redelivery, { lane: observation } on a matched facility', async () => {
    const r = await POST(req(envelope()));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, lane: 'lead', leadId: 'lead_1', duplicate: false, phiFlag: false });
    leadFind.mockResolvedValue({ id: 'lead_1' });
    expect(await (await POST(req(envelope()))).json()).toMatchObject({ lane: 'lead', duplicate: true });
    leadFind.mockResolvedValue(null);
    homesFind.mockResolvedValue([{ id: 'home_hit', phone: '2165550111' }]);
    const f = await POST(req(envelope({ caller_type: 'facility', beds_available: 1 })));
    expect(await f.json()).toMatchObject({ ok: true, lane: 'observation', observationId: 'obs_1', qaStatus: 'pending' });
  });
});
