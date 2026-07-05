/**
 * Unit tests for the lead-consent recorder (feat/lead-consent-capture):
 * both consent states persisted, text version stamped, malformed payloads
 * normalized to consentGiven=false, failures swallowed (never block the lead),
 * and no contact PII in the Sentry error context.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: { leadConsent: { create: jest.fn() } },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { normalizeConsentPayload, recordLeadConsent } from '@/lib/consent/lead-consent';
import {
  CURRENT_LEAD_CONSENT_VERSION,
  LEAD_CONSENT_FORMS,
  LEAD_CONSENT_VERSIONS,
  leadConsentText,
} from '@/lib/consent/lead-consent-text';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';

const mockedCreate = prisma.leadConsent.create as jest.Mock;
const mockedCapture = captureError as jest.Mock;

const req = () =>
  new NextRequest('http://localhost/api/inquiries', {
    method: 'POST',
    headers: {
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'user-agent': 'jest-agent',
      referer: 'http://localhost/homes/abc',
    },
  });

beforeEach(() => {
  mockedCreate.mockResolvedValue({ id: 'consent-1' } as never);
});
afterEach(() => jest.clearAllMocks());

describe('consent copy versioning', () => {
  it('has a current version whose text exists and mentions the TCPA essentials', () => {
    const text = leadConsentText();
    expect(LEAD_CONSENT_VERSIONS[CURRENT_LEAD_CONSENT_VERSION]).toBe(text);
    expect(text).toMatch(/automated technology/i);
    expect(text).toMatch(/not a condition/i);
    expect(text).toMatch(/Privacy Policy/);
  });

  it('falls back to the current text for unknown versions', () => {
    expect(leadConsentText('v0-nonexistent')).toBe(leadConsentText());
  });
});

describe('normalizeConsentPayload', () => {
  it('accepts a well-formed granted payload', () => {
    expect(
      normalizeConsentPayload({ given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION }),
    ).toEqual({ given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION });
  });

  it('normalizes anything malformed to consentGiven=false with the current version', () => {
    for (const bad of [undefined, null, 'yes', 42, { given: 'true' }, { given: 1 }, []]) {
      const norm = normalizeConsentPayload(bad);
      expect(norm.given).toBe(false);
      expect(norm.textVersion).toBe(CURRENT_LEAD_CONSENT_VERSION);
    }
  });

  it('replaces an unknown claimed text version with the current one', () => {
    expect(normalizeConsentPayload({ given: true, textVersion: 'v99-fake' }).textVersion).toBe(
      CURRENT_LEAD_CONSENT_VERSION,
    );
  });
});

describe('recordLeadConsent', () => {
  it('writes a granted record with version, ip, user-agent, and contact snapshot', async () => {
    const id = await recordLeadConsent({
      consent: { given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION },
      sourceForm: LEAD_CONSENT_FORMS.HOME_INQUIRY,
      req: req(),
      contactName: 'Jane Doe',
      contactEmail: 'jane@example.com',
      contactPhone: '555-0100',
      inquiryId: 'inq-1',
    });
    expect(id).toBe('consent-1');
    const data = (mockedCreate.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({
      consentGiven: true,
      consentTextVersion: CURRENT_LEAD_CONSENT_VERSION,
      sourceForm: 'home_inquiry',
      ip: '203.0.113.7', // first hop of x-forwarded-for only
      userAgent: 'jest-agent',
      sourceUrl: 'http://localhost/homes/abc',
      contactEmail: 'jane@example.com',
      inquiryId: 'inq-1',
    });
  });

  it('writes a declined record too (declines are evidence)', async () => {
    await recordLeadConsent({
      consent: { given: false, textVersion: CURRENT_LEAD_CONSENT_VERSION },
      sourceForm: LEAD_CONSENT_FORMS.TOUR_REQUEST,
      req: req(),
      contactEmail: 'jane@example.com',
      tourRequestId: 'tour-1',
    });
    const data = (mockedCreate.mock.calls[0][0] as any).data;
    expect(data.consentGiven).toBe(false);
    expect(data.tourRequestId).toBe('tour-1');
  });

  it('records consentGiven=false when the form sent no consent payload at all', async () => {
    await recordLeadConsent({
      consent: undefined,
      sourceForm: LEAD_CONSENT_FORMS.DEMO_REQUEST,
      req: req(),
    });
    const data = (mockedCreate.mock.calls[0][0] as any).data;
    expect(data.consentGiven).toBe(false);
    expect(data.consentTextVersion).toBe(CURRENT_LEAD_CONSENT_VERSION);
  });

  it('never throws when the DB write fails, and sends no PII to Sentry', async () => {
    mockedCreate.mockRejectedValue(new Error('db down') as never);
    const id = await recordLeadConsent({
      consent: { given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION },
      sourceForm: LEAD_CONSENT_FORMS.HOME_INQUIRY,
      req: req(),
      contactName: 'Jane Doe',
      contactEmail: 'jane@example.com',
      contactPhone: '555-0100',
    });
    expect(id).toBeNull();
    expect(mockedCapture).toHaveBeenCalledTimes(1);
    const sentryContext = JSON.stringify(mockedCapture.mock.calls[0][1] ?? {});
    expect(sentryContext).not.toContain('jane@example.com');
    expect(sentryContext).not.toContain('Jane Doe');
    expect(sentryContext).not.toContain('555-0100');
  });

  it('works without a request object (no ip/ua available)', async () => {
    await recordLeadConsent({
      consent: { given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION },
      sourceForm: LEAD_CONSENT_FORMS.MARKETPLACE_LEAD,
      leadId: 'lead-1',
    });
    const data = (mockedCreate.mock.calls[0][0] as any).data;
    expect(data.ip).toBeNull();
    expect(data.userAgent).toBeNull();
    expect(data.leadId).toBe('lead-1');
  });
});
