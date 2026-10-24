/**
 * OL-177 — inquiries on UNCLAIMED homes → admin inbound queue + admin alert +
 * family confirmation. Prisma and Resend are mocked; nothing sends.
 *  - the queue row is a FAMILY / WEB_INQUIRY InboundLead keyed to the inquiry;
 *  - the admin alert goes to ADMIN_NOTIFY_EMAIL (fallbacks: CLAIM_NOTIFY_EMAIL,
 *    then chris@) with family name, contact, home, payer lane, timeframe — and
 *    never the free-text message, resident name or care needs;
 *  - the family email says "A CareLinkAI advisor will follow up." with no time;
 *  - idempotent per inquiry; RESEND_API_KEY unset → skipped; never throws;
 *  - /api/inquiries routes ONLY unclaimed homes here.
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

const guardedResendSend = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('@/lib/email', () => ({ guardedResendSend: (...a: unknown[]) => guardedResendSend(...a) }));
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendSMS: jest.fn(), isConfigured: () => false } }));
const captureError = jest.fn();
jest.mock('@/lib/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
jest.mock('@/lib/prisma', () => ({ prisma: { inboundLead: { findUnique: jest.fn(), create: jest.fn() } } }));

import { prisma } from '@/lib/prisma';
import {
  ADVISOR_FOLLOW_UP_TEXT,
  adminAlertContent,
  familyConfirmationContent,
  routeUnclaimedInquiry,
  timeframeFrom,
  urgencyFromTimeframe,
  webInquiryReason,
  type UnclaimedInquiryInput,
} from '@/lib/leads/web-inquiry-lead';

const db = prisma as unknown as { inboundLead: { findUnique: jest.Mock<any>; create: jest.Mock<any> } };

// The unclaimed fixture: what /api/inquiries passes for a home owned by the
// directory placeholder account. The Inquiry row itself also holds a message,
// resident name and care needs — none of which reach this module.
const fixture = (over: Partial<UnclaimedInquiryInput> = {}): UnclaimedInquiryInput => ({
  inquiryId: 'inq_1',
  homeId: 'home_unclaimed',
  homeName: 'Windsor Heights',
  contactName: 'Jordan Rivera',
  contactEmail: 'jordan@example.com',
  contactPhone: '(216) 555-0142',
  payerSource: 'MEDICAID_WAIVER',
  additionalInfo: 'Move-in timeframe: 1-3 months',
  receivedAt: new Date('2026-10-21T15:00:00.000Z'), // a Wednesday, 11:00 ET — business hours
  ...over,
});

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV, RESEND_API_KEY: 're_test', ADMIN_NOTIFY_EMAIL: 'alerts@example.com' };
  delete process.env['CLAIM_NOTIFY_EMAIL'];
  db.inboundLead.findUnique.mockResolvedValue(null);
  db.inboundLead.create.mockResolvedValue({ id: 'lead_1' });
  guardedResendSend.mockResolvedValue({ data: { id: 'email_1' }, error: null });
});
afterAll(() => {
  process.env = ENV;
});

describe('pure helpers', () => {
  it('reads the timeframe the family picked and maps urgency', () => {
    expect(timeframeFrom('Move-in timeframe: Immediately')).toBe('Immediately');
    expect(timeframeFrom(null)).toBeNull();
    expect(urgencyFromTimeframe('Immediately')).toBe('TODAY');
    expect(urgencyFromTimeframe('3-6 months')).toBe('PLANNING');
    expect(urgencyFromTimeframe(null)).toBeNull();
  });

  it('the queue reason names home, payer lane and timeframe (≤ 280)', () => {
    expect(webInquiryReason(fixture())).toBe(
      'Web inquiry on unclaimed listing: Windsor Heights · Free lane (Medicaid / Medicare / VA — no placement fee) · 1-3 months',
    );
    expect(webInquiryReason(fixture({ payerSource: null, additionalInfo: null }))).toContain('Unknown (not sure yet / unanswered) · timeframe not given');
    expect(webInquiryReason(fixture({ homeName: 'x'.repeat(400) })).length).toBeLessThanOrEqual(280);
  });

  it('admin alert carries exactly name, email, phone, home, payer lane, timeframe', () => {
    const c = adminAlertContent(fixture());
    expect(c.subject).toBe('📝 Family inquiry (unclaimed listing): Jordan Rivera → Windsor Heights');
    for (const v of ['Family: Jordan Rivera', 'Email: jordan@example.com', 'Phone: (216) 555-0142', 'Home: Windsor Heights (unclaimed listing)', 'Payer lane: Free lane', 'Timeframe: 1-3 months', '/admin/inbound-leads']) {
      expect(c.text).toContain(v);
    }
    expect(c.html).toContain('Jordan Rivera');
  });

  it('family confirmation: advisor will follow up, no time promise', () => {
    const c = familyConfirmationContent(fixture());
    expect(ADVISOR_FOLLOW_UP_TEXT).toBe('A CareLinkAI advisor will follow up.');
    expect(c.text).toContain('Hi Jordan,');
    expect(c.text).toContain('A CareLinkAI advisor will follow up.');
    expect(`${c.subject} ${c.text} ${c.html}`).not.toMatch(/\b\d+\s*(hours?|days?|minutes?)\b|today|tomorrow|shortly|soon/i);
  });

  it('HTML-escapes what the family typed', () => {
    expect(adminAlertContent(fixture({ contactName: '<b>x</b>' })).html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('routeUnclaimedInquiry (unclaimed fixture)', () => {
  it('queues a FAMILY / WEB_INQUIRY lead keyed to the inquiry', async () => {
    const r = await routeUnclaimedInquiry(fixture());
    expect(r).toEqual({ leadId: 'lead_1', created: true, adminEmail: 'sent', familyEmail: 'sent' });
    expect(db.inboundLead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'web-inquiry:inq_1',
        source: 'WEB_INQUIRY',
        callerType: 'FAMILY',
        name: 'Jordan Rivera',
        organization: 'Windsor Heights',
        callbackPhone: '(216) 555-0142',
        contactEmail: 'jordan@example.com',
        homeId: 'home_unclaimed',
        inquiryId: 'inq_1',
        urgency: 'PLANNING',
        afterHours: false,
      }),
      select: { id: true },
    });
  });

  it('emails ADMIN_NOTIFY_EMAIL, then the family', async () => {
    await routeUnclaimedInquiry(fixture());
    expect(guardedResendSend).toHaveBeenCalledTimes(2);
    const [admin, family] = guardedResendSend.mock.calls.map((c) => c[0]);
    expect(admin.to).toEqual(['alerts@example.com']);
    expect(admin.subject).toContain('Windsor Heights');
    expect(family.to).toEqual(['jordan@example.com']);
    expect(family.text).toContain('A CareLinkAI advisor will follow up.');
  });

  it('falls back to CLAIM_NOTIFY_EMAIL, then chris@getcarelinkai.com', async () => {
    delete process.env['ADMIN_NOTIFY_EMAIL'];
    process.env['CLAIM_NOTIFY_EMAIL'] = 'claims@example.com';
    await routeUnclaimedInquiry(fixture());
    expect(guardedResendSend.mock.calls[0]![0].to).toEqual(['claims@example.com']);
    guardedResendSend.mockClear();
    delete process.env['CLAIM_NOTIFY_EMAIL'];
    await routeUnclaimedInquiry(fixture({ inquiryId: 'inq_2' }));
    expect(guardedResendSend.mock.calls[0]![0].to).toEqual(['chris@getcarelinkai.com']);
  });

  it('is idempotent per inquiry: an existing row means no second row or email', async () => {
    db.inboundLead.findUnique.mockResolvedValue({ id: 'lead_existing' });
    const r = await routeUnclaimedInquiry(fixture());
    expect(r).toEqual({ leadId: 'lead_existing', created: false, adminEmail: 'skipped', familyEmail: 'skipped' });
    expect(db.inboundLead.create).not.toHaveBeenCalled();
    expect(guardedResendSend).not.toHaveBeenCalled();
  });

  it('RESEND_API_KEY unset → row still queued, both emails skipped', async () => {
    delete process.env['RESEND_API_KEY'];
    const r = await routeUnclaimedInquiry(fixture());
    expect(r).toMatchObject({ created: true, adminEmail: 'skipped', familyEmail: 'skipped' });
    expect(guardedResendSend).not.toHaveBeenCalled();
  });

  it('no phone / no email typed → null phone, no family email', async () => {
    const r = await routeUnclaimedInquiry(fixture({ contactPhone: null, contactEmail: null }));
    expect(db.inboundLead.create.mock.calls[0]![0].data).toMatchObject({ callbackPhone: null, contactEmail: null });
    expect(r.familyEmail).toBe('skipped');
  });

  it('never throws: a DB failure is captured and reported', async () => {
    db.inboundLead.create.mockRejectedValue(new Error('db down'));
    await expect(routeUnclaimedInquiry(fixture())).resolves.toMatchObject({ leadId: null, created: false });
    expect(captureError).toHaveBeenCalled();
  });
});

describe('/api/inquiries wiring + confirmation screen', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/inquiries/route.ts'), 'utf8');
  const page = fs.readFileSync(path.join(process.cwd(), 'src/app/homes/[id]/page.tsx'), 'utf8');

  it('routes only unclaimed homes into the inbound queue', () => {
    expect(route).toMatch(/const unclaimed = isUnclaimedHome\(operatorEmail\);\s*if \(unclaimed\) \{\s*await routeUnclaimedInquiry\(/);
  });

  it('the unclaimed confirmation screen promises an advisor, not the home or a time', () => {
    expect(page).toContain('{ADVISOR_FOLLOW_UP_TEXT}');
    expect(page).not.toContain('let them know a family is waiting');
    expect(page).not.toMatch(/within 24 hours/);
  });
});
