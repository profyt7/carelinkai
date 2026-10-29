/**
 * OL-167b — inbound-call alerts. Twilio and Resend are mocked; nothing sends.
 *  - PLANNER → SMS (ADMIN_NOTIFY_MOBILE) + email (ADMIN_NOTIFY_EMAIL);
 *  - FAMILY / OTHER → email only;
 *  - FACILITY → email only (matched: QA observation + QA link; unmatched:
 *    lead + leads link) with openings / price / Medicaid;
 *  - subjects start with the caller type; no alert carries reason text;
 *  - the SMS never carries the reason / transcript; the email carries the
 *    recording + transcript links and the admin page link;
 *  - missing ADMIN_NOTIFY_MOBILE / RESEND_API_KEY → skipped, not failed;
 *  - a throwing channel is logged, never thrown; the webhook still answers 200.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const sendSMS = jest.fn();
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendSMS: (...a: unknown[]) => sendSMS(...a), isConfigured: () => true } }));
const guardedResendSend = jest.fn();
jest.mock('@/lib/email', () => ({ guardedResendSend: (...a: unknown[]) => guardedResendSend(...a) }));
const captureError = jest.fn();
jest.mock('@/lib/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
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

import { prisma } from '@/lib/prisma';
import { alertChannels, alertLine, alertSubject, sendFacilityObservationAlert, sendInboundLeadAlerts, type InboundAlertInput } from '@/lib/leads/inbound-alerts';
import { signElevenLabsPayload, ELEVENLABS_SIGNATURE_HEADER } from '@/lib/availability/call-result';
import { POST } from '@/app/api/webhooks/elevenlabs/inbound-lead/route';

const lead = (over: Partial<InboundAlertInput> = {}): InboundAlertInput => ({
  leadId: 'lead_1',
  callerType: 'PLANNER',
  name: 'Pat Example',
  organization: 'MetroHealth',
  callbackPhone: '+12165550199',
  urgency: 'TODAY',
  afterHours: false,
  phiFlag: false,
  transcriptUrl: 'https://elevenlabs.io/app/conversational-ai/history/conv_1',
  recordingUrl: 'https://api.elevenlabs.io/v1/convai/conversations/conv_1/audio',
  receivedAt: new Date('2026-10-21T14:00:00.000Z'),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env['ADMIN_NOTIFY_MOBILE'] = '+12165550000';
  process.env['ADMIN_NOTIFY_EMAIL'] = 'chris@example.com';
  process.env['RESEND_API_KEY'] = 'unit';
  sendSMS.mockResolvedValue(true);
  guardedResendSend.mockResolvedValue({ data: { id: 'msg' }, error: null });
});

describe('alert line + channels', () => {
  it('the SMS line is name, org, phone, urgency — nothing else', () => {
    expect(alertLine(lead())).toBe('CareLinkAI planner callback: Pat Example, MetroHealth, +12165550199, today');
    expect(alertLine(lead({ name: null, organization: null, urgency: null }))).toBe('CareLinkAI planner callback: name not given, no org, +12165550199, urgency not given');
  });
  it('every caller type emails; only PLANNER also gets the SMS', () => {
    expect(alertChannels('PLANNER')).toEqual({ sms: true, email: true });
    expect(alertChannels('FAMILY')).toEqual({ sms: false, email: true });
    expect(alertChannels('OTHER')).toEqual({ sms: false, email: true });
    expect(alertChannels('FACILITY')).toEqual({ sms: false, email: true });
  });
  it('subjects start with the caller type', () => {
    expect(alertSubject('PLANNER', 'Pat Example', 'MetroHealth')).toBe('[Planner] Pat Example (MetroHealth) called back');
    expect(alertSubject('FAMILY', 'Jordan', null)).toBe('[Family] Jordan called back');
    expect(alertSubject('OTHER', null, null)).toBe('[Other] Caller called back');
    expect(alertSubject('FACILITY', 'Pleasant Pointe', null)).toBe('[Facility] Pleasant Pointe called back');
  });
});

describe('sendInboundLeadAlerts', () => {
  it('PLANNER: one SMS to ADMIN_NOTIFY_MOBILE with the line only, one email with links + admin page', async () => {
    const r = await sendInboundLeadAlerts(lead());
    expect(r).toEqual({ sms: 'sent', email: 'sent' });
    expect(sendSMS).toHaveBeenCalledTimes(1);
    expect(sendSMS).toHaveBeenCalledWith('+12165550000', 'CareLinkAI planner callback: Pat Example, MetroHealth, +12165550199, today');
    expect(String(sendSMS.mock.calls[0][1])).not.toMatch(/elevenlabs|transcript|recording|redact/i);
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string | string[]>;
    expect(args['to']).toEqual(['chris@example.com']);
    expect(args['subject']).toBe('[Planner] Pat Example (MetroHealth) called back');
    expect(String(args['text'])).toContain('CareLinkAI planner callback: Pat Example, MetroHealth, +12165550199, today');
    expect(String(args['text'])).toContain('https://api.elevenlabs.io/v1/convai/conversations/conv_1/audio');
    expect(String(args['text'])).toContain('https://elevenlabs.io/app/conversational-ai/history/conv_1');
    expect(String(args['text'])).toContain('/admin/inbound-leads');
  });
  it('FAMILY: email only, [Family] subject', async () => {
    expect(await sendInboundLeadAlerts(lead({ callerType: 'FAMILY', name: 'Jordan', organization: null }))).toEqual({ sms: 'skipped', email: 'sent' });
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['subject']).toBe('[Family] Jordan called back');
    expect(args['to']).toEqual(['chris@example.com']);
  });
  it('OTHER: email only, [Other] subject', async () => {
    expect(await sendInboundLeadAlerts(lead({ callerType: 'OTHER', name: 'Sam', organization: 'Acme Medical' }))).toEqual({ sms: 'skipped', email: 'sent' });
    expect(sendSMS).not.toHaveBeenCalled();
    expect((guardedResendSend.mock.calls[0][0] as Record<string, string>)['subject']).toBe('[Other] Sam (Acme Medical) called back');
  });
  it('FACILITY (unmatched → lead): email only with the facts and the leads link, never an SMS', async () => {
    const r = await sendInboundLeadAlerts(
      lead({ callerType: 'FACILITY', name: 'Dana', organization: 'Pleasant Pointe', urgency: null, facility: { bedsAvailable: 2, startingPrice: 4500, medicaidWaiver: 'accepting_new' } }),
    );
    expect(r).toEqual({ sms: 'skipped', email: 'sent' });
    expect(sendSMS).not.toHaveBeenCalled();
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['subject']).toBe('[Facility] Pleasant Pointe called back');
    expect(args['text']).toContain('Facility callback: Dana, Pleasant Pointe, +12165550199');
    expect(args['text']).toContain('Openings: 2');
    expect(args['text']).toContain('Starting price: $4,500/mo');
    expect(args['text']).toContain('Medicaid waiver: accepting new residents');
    expect(args['text']).toContain('/admin/inbound-leads');
    expect(`${args['text']} ${args['html']}`).not.toMatch(/elevenlabs|transcript/i);
  });
  it('FACILITY (matched → QA observation): email with the facts and a link to the QA item, never an SMS', async () => {
    const r = await sendFacilityObservationAlert({
      observationId: 'obs_7',
      homeName: 'Pleasant Pointe',
      name: 'Dana',
      organization: 'Pleasant Pointe Senior Living',
      callbackPhone: '+12165550111',
      facility: { bedsAvailable: null, startingPrice: null, medicaidWaiver: 'current_only' },
      receivedAt: new Date('2026-10-21T14:00:00.000Z'),
    });
    expect(r).toEqual({ sms: 'skipped', email: 'sent' });
    expect(sendSMS).not.toHaveBeenCalled();
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['to']).toEqual(['chris@example.com']);
    expect(args['subject']).toBe('[Facility] Pleasant Pointe called back');
    expect(args['text']).toContain('Facility callback: Dana, Pleasant Pointe, +12165550111');
    expect(args['text']).toContain('Openings: not given');
    expect(args['text']).toContain('Starting price: not given');
    expect(args['text']).toContain('Medicaid waiver: current residents only');
    expect(args['text']).toContain('/admin/call-qa#obs-obs_7');
    expect(args['html']).toContain('/admin/call-qa#obs-obs_7');
  });
  it('FACILITY QA alert never throws: Resend down → failed, unset key → skipped', async () => {
    const obs = { observationId: 'obs_8', homeName: 'X', name: null, organization: null, callbackPhone: null, facility: { bedsAvailable: 1, startingPrice: null, medicaidWaiver: null }, receivedAt: new Date() };
    guardedResendSend.mockRejectedValueOnce(new Error('network'));
    expect(await sendFacilityObservationAlert(obs)).toEqual({ sms: 'skipped', email: 'failed' });
    delete process.env['RESEND_API_KEY'];
    expect(await sendFacilityObservationAlert(obs)).toEqual({ sms: 'skipped', email: 'skipped' });
  });
  it('flags (after hours, PHI redacted) ride the email, never the SMS', async () => {
    await sendInboundLeadAlerts(lead({ afterHours: true, phiFlag: true }));
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['text']).toMatch(/after hours/);
    expect(args['text']).toMatch(/reason redacted/);
    expect(String(sendSMS.mock.calls[0][1])).not.toMatch(/after hours|redact/);
  });
  it('unset ADMIN_NOTIFY_MOBILE → SMS skipped (email still sent); unset RESEND_API_KEY → email skipped', async () => {
    delete process.env['ADMIN_NOTIFY_MOBILE'];
    expect(await sendInboundLeadAlerts(lead())).toEqual({ sms: 'skipped', email: 'sent' });
    expect(sendSMS).not.toHaveBeenCalled();
    delete process.env['RESEND_API_KEY'];
    expect(await sendInboundLeadAlerts(lead({ callerType: 'FAMILY' }))).toEqual({ sms: 'skipped', email: 'skipped' });
  });
  it('a failing or throwing channel is logged and reported, never thrown', async () => {
    sendSMS.mockRejectedValueOnce(new Error('twilio down'));
    guardedResendSend.mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } });
    expect(await sendInboundLeadAlerts(lead())).toEqual({ sms: 'failed', email: 'failed' });
    expect(captureError).toHaveBeenCalledTimes(1);
    guardedResendSend.mockRejectedValueOnce(new Error('network'));
    expect(await sendInboundLeadAlerts(lead({ callerType: 'FAMILY' }))).toEqual({ sms: 'skipped', email: 'failed' });
  });
});

describe('webhook → alerts (fire-and-forget)', () => {
  const SECRET = 'whsec_unit_alerts';
  const body = (callerType = 'discharge planner') =>
    JSON.stringify({
      type: 'post_call_transcription',
      data: {
        conversation_id: 'conv_alert_1',
        metadata: { start_time_unix_secs: 1_761_000_000, phone_call: { external_number: '+12165550111' } },
        analysis: { data_collection_results: { caller_type: { value: callerType }, caller_name: { value: 'Pat' }, organization: { value: 'MetroHealth' }, callback_phone: { value: '216-555-0199' }, urgency: { value: 'today' }, reason: { value: 'needs a bed' } } },
      },
    });
  const req = (raw: string) =>
    new NextRequest('http://localhost/api/webhooks/elevenlabs/inbound-lead', {
      method: 'POST',
      body: raw,
      headers: { 'content-type': 'application/json', [ELEVENLABS_SIGNATURE_HEADER]: signElevenLabsPayload(SECRET, raw) },
    });
  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    process.env['ELEVENLABS_WEBHOOK_SECRET'] = SECRET;
    (prisma as any).inboundLead.findUnique.mockResolvedValue(null);
    (prisma as any).availabilityObservation.findUnique.mockResolvedValue(null);
    (prisma as any).assistedLivingHome.findMany.mockResolvedValue([]);
    (prisma as any).inboundLead.create.mockImplementation(async (args: any) => ({ id: 'lead_9', ...args.data }));
  });

  it('a planner call answers 200 and then sends the SMS + email once; a redelivery sends nothing', async () => {
    const r = await POST(req(body()));
    expect(r.status).toBe(200);
    await flush();
    expect(sendSMS).toHaveBeenCalledTimes(1);
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    expect(String(sendSMS.mock.calls[0][1])).not.toContain('needs a bed');
    (prisma as any).inboundLead.findUnique.mockResolvedValue({ id: 'lead_9' });
    await POST(req(body()));
    await flush();
    expect(sendSMS).toHaveBeenCalledTimes(1);
  });
  it('alert failure never changes the webhook response', async () => {
    sendSMS.mockRejectedValue(new Error('twilio down'));
    guardedResendSend.mockRejectedValue(new Error('resend down'));
    const r = await POST(req(body()));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, lane: 'lead' });
    await flush();
  });
  it('a family call emails only, [Family] subject, no reason text', async () => {
    await POST(req(body('daughter')));
    await flush();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['subject']).toMatch(/^\[Family\] /);
    expect(`${args['subject']} ${args['text']} ${args['html']}`).not.toContain('needs a bed');
  });
  it('an unmatched facility call emails (leads link), no SMS', async () => {
    await POST(req(body('community')));
    await flush();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['subject']).toBe('[Facility] MetroHealth called back');
    expect(args['text']).toContain('/admin/inbound-leads');
    expect(`${args['text']} ${args['html']}`).not.toContain('needs a bed');
  });
  it('a matched facility call writes the QA observation AND emails a link to it; a redelivery sends nothing', async () => {
    (prisma as any).assistedLivingHome.findMany.mockResolvedValue([{ id: 'home_pp', name: 'Pleasant Pointe', phone: '216-555-0111' }]);
    (prisma as any).availabilityObservation.create.mockResolvedValue({ id: 'obs_pp' });
    const r = await POST(req(body('community')));
    expect(await r.json()).toMatchObject({ ok: true, lane: 'observation', observationId: 'obs_pp', qaStatus: 'pending' });
    expect((prisma as any).availabilityObservation.create.mock.calls[0][0].data).toMatchObject({ homeId: 'home_pp', qaStatus: 'PENDING' });
    await flush();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, string>;
    expect(args['subject']).toBe('[Facility] Pleasant Pointe called back');
    expect(args['text']).toContain('Facility callback: Pat, Pleasant Pointe, +12165550199');
    expect(args['text']).toContain('/admin/call-qa#obs-obs_pp');
    expect(`${args['text']} ${args['html']}`).not.toContain('needs a bed');
    (prisma as any).availabilityObservation.findUnique.mockResolvedValue({ id: 'obs_pp' });
    await POST(req(body('community')));
    await flush();
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
  });
});
