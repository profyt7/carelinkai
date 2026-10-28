/**
 * OL-167b — inbound-lead alerts. Twilio and Resend are mocked; nothing sends.
 *  - PLANNER → SMS (ADMIN_NOTIFY_MOBILE) + email (ADMIN_NOTIFY_EMAIL);
 *  - FAMILY / OTHER → email only; FACILITY → nothing;
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
import { alertChannels, alertLine, sendInboundLeadAlerts, type InboundAlertInput } from '@/lib/leads/inbound-alerts';
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
  it('PLANNER → sms + email; FAMILY / OTHER → email; FACILITY → nothing', () => {
    expect(alertChannels('PLANNER')).toEqual({ sms: true, email: true });
    expect(alertChannels('FAMILY')).toEqual({ sms: false, email: true });
    expect(alertChannels('OTHER')).toEqual({ sms: false, email: true });
    expect(alertChannels('FACILITY')).toEqual({ sms: false, email: false });
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
    expect(args['subject']).toContain('CareLinkAI planner callback: Pat Example, MetroHealth, +12165550199, today');
    expect(String(args['text'])).toContain('https://api.elevenlabs.io/v1/convai/conversations/conv_1/audio');
    expect(String(args['text'])).toContain('https://elevenlabs.io/app/conversational-ai/history/conv_1');
    expect(String(args['text'])).toContain('/admin/inbound-leads');
  });
  it('FAMILY and OTHER: email only; FACILITY: nothing', async () => {
    expect(await sendInboundLeadAlerts(lead({ callerType: 'FAMILY' }))).toEqual({ sms: 'skipped', email: 'sent' });
    expect(await sendInboundLeadAlerts(lead({ callerType: 'OTHER' }))).toEqual({ sms: 'skipped', email: 'sent' });
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).toHaveBeenCalledTimes(2);
    jest.clearAllMocks();
    expect(await sendInboundLeadAlerts(lead({ callerType: 'FACILITY' }))).toEqual({ sms: 'skipped', email: 'skipped' });
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).not.toHaveBeenCalled();
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
  it('a family call emails only; a facility call (unmatched) alerts nobody', async () => {
    await POST(req(body('daughter')));
    await flush();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    await POST(req(body('community')));
    await flush();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(guardedResendSend).not.toHaveBeenCalled();
  });
});
