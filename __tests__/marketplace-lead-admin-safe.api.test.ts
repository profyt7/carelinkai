/**
 * Marketplace leads (POST /api/leads): every lead is copied to ADMIN_NOTIFY_EMAIL; a test family (+cltest@) or a
 * demo caregiver/provider profile never emails the provider and is marked [TEST]; queues/metrics hide test families.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'u-fam', role: 'FAMILY' } }) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn(async () => undefined) }));
jest.mock('@/lib/consent/lead-consent', () => ({ recordLeadConsent: jest.fn(async () => undefined) }));
jest.mock('@/lib/billing/paid-features', () => ({ isPaidFeatureEnabled: () => true }));
jest.mock('@/lib/providers/boost', () => ({ isBoosted: () => true }));
const sendNewLeadOperatorEmail = jest.fn(async () => true);
jest.mock('@/lib/email', () => ({ sendNewLeadOperatorEmail: (...a: unknown[]) => sendNewLeadOperatorEmail(...(a as [])) }));
const sendAdminLeadEmail = jest.fn(async (_m: any) => 'sent' as const);
jest.mock('@/lib/leads/inbound-alerts', () => ({ sendAdminLeadEmail: (m: any) => sendAdminLeadEmail(m) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

const state = { familyEmail: 'jordan@example.com', providerDemo: false, aideDemo: false };
jest.mock('@/lib/prisma', () => ({
  prisma: {
    family: { findUnique: jest.fn(async () => ({ id: 'fam-1', user: { firstName: 'Jordan', lastName: 'Rivera', email: state.familyEmail, phone: '(216) 555-0142' } })) },
    caregiver: { findUnique: jest.fn(async () => ({ id: 'cg-1', user: { firstName: 'Casey', lastName: 'Aide', isDemo: state.aideDemo } })) },
    provider: { findUnique: jest.fn(async () => ({ id: 'pr-1', businessName: 'Lakeside Home Care', contactEmail: 'owner@lakeside.example', contactName: 'Pat Owner', boostStatus: 'ACTIVE', founderBoostEndsAt: null, user: { isDemo: state.providerDemo } })) },
    lead: { create: jest.fn(async (a: any) => ({ id: 'lead-1', targetType: a.data.targetType, status: 'NEW', createdAt: new Date(), preferredStartDate: null, expectedHoursPerWeek: a.data.expectedHoursPerWeek ?? null })) },
  },
}));

import { POST } from '@/app/api/leads/route';

const MESSAGE = 'Mom needs help bathing after her hip surgery';
const post = (targetType: 'AIDE' | 'PROVIDER') => POST(new NextRequest('http://localhost/api/leads', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ targetType, targetId: targetType === 'AIDE' ? 'cg-1' : 'pr-1', message: MESSAGE, expectedHoursPerWeek: 20, location: 'Lakewood, OH' }),
}));
const adminMail = () => { expect(sendAdminLeadEmail).toHaveBeenCalledTimes(1); return sendAdminLeadEmail.mock.calls[0][0] as { subject: string; text: string; html: string }; };

beforeEach(() => {
  [sendNewLeadOperatorEmail, sendAdminLeadEmail].forEach((m) => m.mockClear());
  Object.assign(state, { familyEmail: 'jordan@example.com', providerDemo: false, aideDemo: false });
});

describe('POST /api/leads', () => {
  it('real lead to a boosted provider: provider emailed AND admin copy (no message/location in it)', async () => {
    expect((await post('PROVIDER')).status).toBe(201);
    expect(sendNewLeadOperatorEmail).toHaveBeenCalledTimes(1);
    const m = adminMail();
    expect(m.subject).toBe('📝 Marketplace request (provider): Jordan Rivera → Lakeside Home Care');
    expect(m.text).toContain('emailed directly (Boost)');
    for (const body of [m.subject, m.text, m.html]) { expect(body).not.toContain(MESSAGE); expect(body).not.toContain('Lakewood'); }
  });

  it('real lead to a caregiver: admin copy says caregiver', async () => {
    await post('AIDE');
    expect(adminMail().subject).toBe('📝 Marketplace request (caregiver): Jordan Rivera → Casey Aide');
  });

  it('test family: provider not emailed; admin copy marked [TEST]', async () => {
    state.familyEmail = 'profyt7+cltest@gmail.com';
    await post('PROVIDER');
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    const m = adminMail();
    expect(m.subject.startsWith('[TEST] ')).toBe(true);
    expect(m.text).toContain('no provider was emailed');
  });

  it('demo provider profile: provider not emailed; [TEST] (provider, demo profile)', async () => {
    state.providerDemo = true;
    await post('PROVIDER');
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(adminMail().subject).toMatch(/^\[TEST\] .*\(provider, demo profile\)/);
  });

  it('demo caregiver profile: [TEST] (caregiver, demo profile)', async () => {
    state.aideDemo = true;
    await post('AIDE');
    expect(adminMail().subject).toMatch(/^\[TEST\] .*\(caregiver, demo profile\)/);
  });

  it("provider/caregiver/operator lead queues and admin metrics hide test families' leads", () => {
    const src = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
    expect(src('src/app/provider/page.tsx').match(/family: \{ user: REAL_FAMILY_USER \}/g)).toHaveLength(3);
    expect(src('src/app/caregiver/page.tsx')).toContain("targetType: 'AIDE', family: { user: REAL_FAMILY_USER }");
    expect(src('src/app/api/operator/leads/route.ts')).toMatch(/where\.assignedOperatorId = session!\.user!\.id;\s*where\.family = \{ user: REAL_FAMILY_USER \};/);
    expect(src('src/app/api/admin/metrics/route.ts').match(/family: \{ user: REAL_FAMILY_USER \}/g)).toHaveLength(5);
  });
});
