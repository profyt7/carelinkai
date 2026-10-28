/**
 * OL-184 — 10DLC SMS opt-in: the exact sentence, the unchecked-by-default
 * checkbox, the legal-page section, and the recorder's store/skip/revoke rules.
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    leadConsent: { create: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

import {
  CURRENT_SMS_CONSENT_VERSION,
  SMS_CONSENT_TEXT,
  SMS_CONSENT_VERSIONS,
  emptySmsConsent,
} from '@/lib/consent/sms-consent';
import { LEAD_CONSENT_VERSIONS } from '@/lib/consent/lead-consent-text';
import SmsConsentCheckbox from '@/components/consent/SmsConsentCheckbox';
import SmsProgramSection from '@/components/legal/SmsProgramSection';
import {
  getSmsConsentState,
  normalizeSmsConsent,
  recordAccountSmsConsent,
  recordSmsConsent,
} from '@/lib/consent/sms-consent-server';
import { prisma } from '@/lib/prisma';

const EXACT =
  'Send me SMS alerts from CareLinkAI about callback requests and listing updates. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';

const create = prisma.leadConsent.create as jest.Mock;
const findFirst = prisma.leadConsent.findFirst as jest.Mock;
const userFind = prisma.user.findUnique as jest.Mock;

const req = () =>
  new Request('http://localhost/x', {
    headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1', 'user-agent': 'jest-agent', referer: 'http://localhost/form' },
  });

beforeEach(() => {
  create.mockResolvedValue({ id: 'lc-1' } as never);
  findFirst.mockResolvedValue(null as never);
  userFind.mockResolvedValue(null as never);
});
afterEach(() => jest.clearAllMocks());

describe('the opt-in sentence', () => {
  it('is exactly the 10DLC copy, versioned with an sms- key that never collides with lead consent', () => {
    expect(SMS_CONSENT_TEXT).toBe(EXACT);
    expect(SMS_CONSENT_VERSIONS[CURRENT_SMS_CONSENT_VERSION]).toBe(EXACT);
    expect(CURRENT_SMS_CONSENT_VERSION.startsWith('sms-')).toBe(true);
    expect(Object.keys(LEAD_CONSENT_VERSIONS).some((k) => k.startsWith('sms-'))).toBe(false);
  });

  it('every form and both legal pages use the shared module — no copy of the sentence anywhere else', () => {
    const root = path.join(__dirname, '..');
    const files = [
      'src/app/homes/[id]/page.tsx',
      'src/app/concierge/ConciergeRequestForm.tsx',
      'src/app/auth/register/page.tsx',
      'src/app/settings/operator/page.tsx',
      'src/app/operator/onboarding/[step]/page.tsx',
      'src/app/settings/profile/page.tsx',
      'src/app/settings/provider/page.tsx',
      'src/app/settings/family/page.tsx',
    ];
    for (const f of files) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      expect({ f, checkbox: src.includes('<SmsConsentCheckbox') }).toEqual({ f, checkbox: true });
      expect({ f, inline: src.includes('Reply STOP to opt out') }).toEqual({ f, inline: false });
    }
    for (const f of ['src/app/privacy/page.tsx', 'src/app/terms/page.tsx']) {
      expect(fs.readFileSync(path.join(root, f), 'utf8')).toContain('<SmsProgramSection');
    }
  });
});

describe('SmsConsentCheckbox', () => {
  it('renders UNCHECKED by default (emptySmsConsent) with the exact sentence, and is not required', () => {
    const html = renderToStaticMarkup(
      <SmsConsentCheckbox checked={emptySmsConsent().given} onChange={() => {}} idPrefix="t" />,
    );
    expect(emptySmsConsent()).toEqual({ given: false, textVersion: CURRENT_SMS_CONSENT_VERSION });
    expect(html).toContain('type="checkbox"');
    expect(html).not.toMatch(/checked=""/);
    expect(html).not.toMatch(/required/);
    expect(html).toContain(EXACT.replace('&', '&amp;'));
  });

  it('reflects a saved opt-in when told to', () => {
    const html = renderToStaticMarkup(<SmsConsentCheckbox checked onChange={() => {}} idPrefix="t" />);
    expect(html).toMatch(/checked=""/);
  });
});

describe('SMS program section (/privacy, /terms)', () => {
  it('quotes the same sentence and explains STOP / HELP', () => {
    const html = renderToStaticMarkup(<SmsProgramSection number={13} accent="#000" />);
    expect(html).toContain('SMS Program');
    expect(html).toContain(EXACT.replace('&', '&amp;'));
    expect(html).toMatch(/STOP/);
    expect(html).toMatch(/HELP/);
  });
});

describe('recordSmsConsent', () => {
  it('checked + phone → one row with consentGiven, version, phone, refs, ip and user agent (consentAt is the DB default timestamp)', async () => {
    const id = await recordSmsConsent({
      consent: { given: true, textVersion: CURRENT_SMS_CONSENT_VERSION },
      sourceForm: 'sms_home_inquiry',
      phone: ' 216-555-0100 ',
      req: req(),
      userId: 'u-1',
      inquiryId: 'inq-1',
      contactEmail: 'a@example.com',
    });
    expect(id).toBe('lc-1');
    expect(create).toHaveBeenCalledTimes(1);
    expect((create.mock.calls[0][0] as any).data).toMatchObject({
      consentGiven: true,
      consentTextVersion: CURRENT_SMS_CONSENT_VERSION,
      sourceForm: 'sms_home_inquiry',
      contactPhone: '216-555-0100',
      userId: 'u-1',
      inquiryId: 'inq-1',
      ip: '198.51.100.9',
      userAgent: 'jest-agent',
      sourceUrl: 'http://localhost/form',
    });
  });

  it('unchecked → nothing stored', async () => {
    expect(await recordSmsConsent({ consent: { given: false }, sourceForm: 'f', phone: '216-555-0100' })).toBeNull();
    expect(await recordSmsConsent({ consent: undefined, sourceForm: 'f', phone: '216-555-0100' })).toBeNull();
    expect(await recordSmsConsent({ consent: 'yes', sourceForm: 'f', phone: '216-555-0100' })).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('checked but no phone → nothing stored', async () => {
    expect(await recordSmsConsent({ consent: { given: true }, sourceForm: 'f', phone: '  ' })).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('an unknown text version is stamped as the current one', () => {
    expect(normalizeSmsConsent({ given: true, textVersion: 'v1-2026-07-04' })).toEqual({
      given: true,
      textVersion: CURRENT_SMS_CONSENT_VERSION,
    });
  });

  it('a write failure never throws (form still goes through)', async () => {
    create.mockRejectedValue(new Error('db down') as never);
    await expect(recordSmsConsent({ consent: { given: true }, sourceForm: 'f', phone: '216-555-0100' })).resolves.toBeNull();
  });
});

describe('account forms (recordAccountSmsConsent)', () => {
  it('no smsConsent key in the request → nothing happens', async () => {
    expect(await recordAccountSmsConsent({ consent: undefined, sourceForm: 'f', userId: 'u-1' })).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('checked → opt-in row using the stored phone when the form did not send one', async () => {
    userFind.mockResolvedValue({ phone: '216-555-0199' } as never);
    await recordAccountSmsConsent({ consent: { given: true }, sourceForm: 'sms_operator_settings', userId: 'u-1' });
    expect((create.mock.calls[0][0] as any).data).toMatchObject({ consentGiven: true, contactPhone: '216-555-0199', userId: 'u-1' });
  });

  it('unchecked after a prior opt-in → a consentGiven=false revocation row', async () => {
    findFirst.mockResolvedValue({ consentGiven: true, consentAt: new Date(), contactPhone: '216-555-0199' } as never);
    await recordAccountSmsConsent({ consent: { given: false }, sourceForm: 'sms_operator_settings', userId: 'u-1', phone: '216-555-0199' });
    expect((create.mock.calls[0][0] as any).data).toMatchObject({ consentGiven: false, userId: 'u-1' });
  });

  it('unchecked with no prior opt-in → nothing stored', async () => {
    await recordAccountSmsConsent({ consent: { given: false }, sourceForm: 'sms_operator_settings', userId: 'u-1', phone: '216-555-0199' });
    expect(create).not.toHaveBeenCalled();
  });

  it('getSmsConsentState reads the latest sms- row for the user', async () => {
    const at = new Date('2026-10-25T12:00:00Z');
    findFirst.mockResolvedValue({ consentGiven: true, consentAt: at, contactPhone: '216-555-0199' } as never);
    expect(await getSmsConsentState('u-1')).toEqual({ given: true, at, phone: '216-555-0199' });
    expect((findFirst.mock.calls[0][0] as any).where).toEqual({ userId: 'u-1', consentTextVersion: { startsWith: 'sms-' } });
  });
});
