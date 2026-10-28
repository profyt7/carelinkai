/**
 * OL-193 — every outbound SMS passes the consent gate in SMSService.send.
 * Twilio and Prisma are mocked; nothing sends. Per path: stored opt-in → sent;
 * none → not sent + masked reason logged; revoked → skipped; ADMIN_NOTIFY_MOBILE
 * exempt; availability poll uses its own opt-in.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const create = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('twilio', () => jest.fn(() => ({ messages: { create: (...a: unknown[]) => create(...a) } })));

type Row = { consentGiven: boolean; consentAt: Date; contactPhone: string | null; userId: string | null };
let consentRows: Row[] = [];
let optedInHomes: string[] = [];

jest.mock('@/lib/prisma', () => {
  const p: any = {
    leadConsent: {
      findMany: jest.fn(async ({ where }: any) =>
        consentRows
          .filter((r) => (r.contactPhone ?? '').endsWith(where.contactPhone.endsWith))
          .sort((a, b) => b.consentAt.getTime() - a.consentAt.getTime()),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        consentRows.find((r) => r.userId === where.userId && r.consentGiven === false && r.consentAt > where.consentAt.gt) ?? null,
      ),
    },
    assistedLivingHome: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.contactMobile.in.some((v: string) => optedInHomes.includes(v)) ? { id: 'home_1' } : null,
      ),
      findMany: jest.fn(async () => [{ id: 'home_1', name: 'Maple House', contactMobile: '+12165550101' }]),
    },
    shiftNeed: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
    coverageAttempt: {
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({ id: 'attempt_1' })),
      update: jest.fn(async () => ({})),
    },
    caregiver: { findMany: jest.fn(async () => []) },
  };
  return { prisma: p };
});
jest.mock('@/lib/oncall/rules', () => ({
  loadRules: () => ({ contact_strategy: { max_waves: 3, parallel_batch: 5 } }),
}));
jest.mock('@/lib/oncall/ranker', () => ({ rankCandidates: (c: unknown[]) => c }));

import { prisma } from '@/lib/prisma';
import { SMSService, smsService } from '@/lib/sms/sms-service';
import { checkSmsConsent, maskSmsNumber, normalizeSmsNumber } from '@/lib/consent/sms-consent-gate';
import { sendSms } from '@/lib/services/sms';
import { dispatchWave } from '@/lib/oncall/dispatcher';
import { GET as availabilityCron } from '@/app/api/cron/availability-sms/route';

const PHONE = '(216) 555-0101';
const E164 = '+12165550101';
const ENV = { ...process.env };
const t = (m: number) => new Date(Date.UTC(2026, 9, 25, 12, m));
let warn: jest.SpiedFunction<typeof console.warn>;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...ENV,
    TWILIO_ACCOUNT_SID: 'AC_test',
    TWILIO_AUTH_TOKEN: 'tok_test',
    TWILIO_PHONE_NUMBER: '+12165559999',
    ADMIN_NOTIFY_MOBILE: '216-555-7777',
    CRON_SECRET: '',
    AVAILABILITY_SMS_ENABLED: '1',
  };
  consentRows = [];
  optedInHomes = [];
  create.mockResolvedValue({ sid: 'SM_1' });
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => {
  process.env = ENV;
});

const optIn = (phone = PHONE, at = t(0), userId: string | null = 'u1') =>
  consentRows.push({ consentGiven: true, consentAt: at, contactPhone: phone, userId });
const revoke = (phone: string | null = PHONE, at = t(5), userId: string | null = 'u1') =>
  consentRows.push({ consentGiven: false, consentAt: at, contactPhone: phone, userId });

function expectSkippedAndMasked() {
  expect(create).not.toHaveBeenCalled();
  const logged = JSON.stringify(warn.mock.calls);
  expect(logged).toContain('skipped');
  expect(logged).not.toContain('555-0101');
  expect(logged).not.toContain(E164);
}

describe('checkSmsConsent', () => {
  it('normalizes and masks numbers', () => {
    expect(normalizeSmsNumber(PHONE)).toBe(E164);
    expect(normalizeSmsNumber('1-216-555-0101')).toBe(E164);
    expect(normalizeSmsNumber('12')).toBeNull();
    expect(maskSmsNumber(PHONE)).toBe('***0101');
  });

  it('opt-in matches the number however it was typed', async () => {
    optIn('216.555.0101');
    await expect(checkSmsConsent(E164)).resolves.toEqual({ ok: true, basis: 'sms_opt_in' });
  });

  it('no row → no_consent; a different number with the same last 4 does not count', async () => {
    optIn('(330) 555-0101');
    await expect(checkSmsConsent(PHONE)).resolves.toEqual({ ok: false, reason: 'no_consent' });
  });

  it('latest row a revocation → revoked', async () => {
    optIn();
    revoke();
    await expect(checkSmsConsent(PHONE)).resolves.toEqual({ ok: false, reason: 'revoked' });
  });

  it('an account revocation with no phone still revokes the user’s earlier opt-in', async () => {
    optIn();
    revoke(null);
    await expect(checkSmsConsent(PHONE)).resolves.toEqual({ ok: false, reason: 'revoked' });
  });

  it('re-opt-in after a revocation counts', async () => {
    optIn(PHONE, t(0));
    revoke(PHONE, t(5));
    optIn(PHONE, t(9));
    await expect(checkSmsConsent(PHONE)).resolves.toEqual({ ok: true, basis: 'sms_opt_in' });
  });

  it('ADMIN_NOTIFY_MOBILE is exempt (staff)', async () => {
    await expect(checkSmsConsent('+1 216 555 7777')).resolves.toEqual({ ok: true, basis: 'staff' });
    expect(prisma.leadConsent.findMany).not.toHaveBeenCalled();
  });

  it('invalid number and a failed lookup fail closed', async () => {
    await expect(checkSmsConsent('n/a')).resolves.toEqual({ ok: false, reason: 'invalid_number' });
    (prisma.leadConsent.findMany as jest.Mock).mockRejectedValueOnce(new Error('db down') as never);
    await expect(checkSmsConsent(PHONE)).resolves.toEqual({ ok: false, reason: 'consent_check_failed' });
  });
});

describe('SMSService.send — the one choke point', () => {
  it('opted in → sent', async () => {
    optIn();
    await expect(smsService.send(PHONE, 'hi')).resolves.toEqual({ sent: true, sid: 'SM_1' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ to: E164, from: '+12165559999', body: 'hi' }));
  });

  it('no consent → typed skip, nothing sent, masked reason logged, never throws', async () => {
    await expect(smsService.send(PHONE, 'hi')).resolves.toEqual({ sent: false, reason: 'no_consent' });
    expectSkippedAndMasked();
  });

  it('revoked → skipped', async () => {
    optIn();
    revoke();
    await expect(smsService.send(PHONE, 'hi')).resolves.toEqual({ sent: false, reason: 'revoked' });
    expectSkippedAndMasked();
  });

  it('staff mobile → sent with no consent row', async () => {
    await expect(smsService.sendSMS('2165557777', 'lead alert')).resolves.toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('not configured → not_configured before any consent lookup', async () => {
    delete process.env['TWILIO_PHONE_NUMBER'];
    await expect(new SMSService().send(PHONE, 'hi')).resolves.toEqual({ sent: false, reason: 'not_configured' });
    expect(prisma.leadConsent.findMany).not.toHaveBeenCalled();
  });
});

// Every wrapper the app calls goes through send(): one case each, with and without consent.
const PATHS: Array<[string, () => Promise<boolean>]> = [
  ['operator new-inquiry alert', () => smsService.sendNewInquiryAlert(PHONE, 'Ann', 'Lee family', 'Mom', 'Maple House')],
  ['operator tour-booked alert', () => smsService.sendTourBookedAlert(PHONE, 'Ann', 'Lee family', 'Maple House')],
  ['operator payment-failed alert', () => smsService.sendPaymentFailedAlert(PHONE, 'Ann')],
  ['unclaimed inquiry claim nudge', () => smsService.sendInquiryClaimNudge(PHONE, 'Maple House', 'https://x/claim')],
  ['unclaimed tour claim nudge', () => smsService.sendTourClaimNudge(PHONE, 'Maple House', 'https://x/claim')],
  ['family inquiry-response alert', () => smsService.sendInquiryResponseReceived(PHONE, 'Bo', 'Maple House')],
  ['family tour reminder', () => smsService.sendTourReminder(PHONE, 'Bo', 'Maple House', t(0))],
  ['inquiry follow-up', () => smsService.sendFollowUpSMS(PHONE, 'Bo', 'inq_12345678')],
  ['ride / caregiver texts (sendSMS)', () => new SMSService().sendSMS(PHONE, 'Ride request from CareLinkAI')],
];

describe.each(PATHS)('%s', (_name, run) => {
  it('with consent → sent', async () => {
    optIn();
    await expect(run()).resolves.toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('without consent → not sent, reason logged', async () => {
    await expect(run()).resolves.toBe(false);
    expectSkippedAndMasked();
  });
  it('revoked → not sent', async () => {
    optIn();
    revoke();
    await expect(run()).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('appointment reminders (services/sms stub)', () => {
  it('no consent → success:false with the reason; consent → stub success', async () => {
    await expect(sendSms({ to: PHONE, body: 'reminder' })).resolves.toEqual({ success: false, error: 'no_consent' });
    optIn();
    await expect(sendSms({ to: PHONE, body: 'reminder' })).resolves.toEqual({ success: true });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('555-0101');
  });
});

describe('availability SMS cron — the availability opt-in', () => {
  const run = () => availabilityCron(new NextRequest('http://localhost/api/cron/availability-sms'));

  it('home opted in → sent', async () => {
    optedInHomes = [E164];
    const body = await (await run()).json();
    expect(body).toMatchObject({ polled: 1, sent: 1 });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('no availability opt-in for the number (e.g. after STOP) → skipped', async () => {
    const body = await (await run()).json();
    expect(body).toMatchObject({ polled: 1, sent: 0 });
    expectSkippedAndMasked();
  });

  it('an account SMS opt-in does not stand in for the availability opt-in', async () => {
    optIn(E164);
    const body = await (await run()).json();
    expect(body.sent).toBe(0);
  });
});

describe('shift-fill cascade (on-call dispatcher)', () => {
  beforeEach(() => {
    (prisma.shiftNeed.findUnique as jest.Mock).mockResolvedValue({
      id: 'need_1', status: 'OPEN', currentWave: 0, requiredCerts: [], requiredSkills: [], notes: null,
      home: { name: 'Maple House', operatorId: 'op_1', address: null }, shift: null,
    } as never);
    (prisma.caregiver.findMany as jest.Mock).mockResolvedValue([
      { id: 'cg_1', userId: 'u1', user: { firstName: 'Cy', lastName: 'Ng', phone: PHONE }, specialties: [], careTypes: [], backgroundCheckStatus: 'CLEAR', reliabilityScore: 1, yearsExperience: 1, hourlyRate: null, homeLat: null, homeLng: null },
    ] as never);
  });

  it('with consent → texted with the status callback, messageSid recorded', async () => {
    optIn();
    await expect(dispatchWave('need_1')).resolves.toMatchObject({ sent: 1 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ to: E164, statusCallback: expect.stringContaining('/api/webhooks/twilio/status') }));
    expect(prisma.coverageAttempt.update).toHaveBeenCalledWith({ where: { id: 'attempt_1' }, data: { messageSid: 'SM_1' } });
  });

  it('without consent → not texted; the attempt records why and is not counted as sent', async () => {
    await expect(dispatchWave('need_1')).resolves.toMatchObject({ sent: 0 });
    expectSkippedAndMasked();
    expect(prisma.coverageAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt_1' },
      data: { outcome: 'ERROR', notes: 'SMS not sent: no_consent' },
    });
  });
});
