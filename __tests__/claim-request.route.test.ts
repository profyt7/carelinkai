/**
 * Sprint W3 item 2 — POST /api/claim/request (cohort claim submit) +
 * /claim cohort-link routing helpers.
 *
 *  - every accepted submit is stored tagged with the cohort (CLEVELAND_AGENCIES);
 *  - a verified cohort claim token upgrades the row to source 'claim_link' with
 *    tokenEmail set, and the cohort comes from the TOKEN, not the form;
 *  - a token for a home (no cohort) or an invalid token leaves it a plain
 *    landing-page claim;
 *  - unknown cohort / bad email → 400; honeypot → 201 with nothing stored;
 *  - no email is sent (there is no mail dependency in the route at all).
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: { claimRequest: { create: jest.fn() } },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { signClaimToken } from '@/lib/claim-token';
import { POST } from '@/app/api/claim/request/route';
import { prisma } from '@/lib/prisma';
import { CLEVELAND_AGENCIES, COHORT_LANDING_PATH, isClaimCohort } from '@/lib/claim-engine/cohorts';

const mockedCreate = prisma.claimRequest.create as jest.Mock;
const SECRET = 'test-secret-for-claim-requests';

let ipCounter = 0;
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/claim/request', {
    method: 'POST',
    // distinct IP per request so the per-IP limiter never trips across tests
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ipCounter}` },
    body: JSON.stringify(body),
  });

const base = {
  cohort: 'CLEVELAND_AGENCIES',
  orgName: 'Lakewood Home Care LLC',
  contactName: 'Dana',
  contactEmail: 'Dana@LakewoodHomeCare.com',
  phone: '216-555-0100',
  city: 'Lakewood',
  serviceTypes: ['Respite care', 'Personal care / companionship'],
  message: 'Hiring STNAs now',
};

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = SECRET;
  mockedCreate.mockImplementation(async (args: any) => ({
    id: 'req-1',
    cohort: args.data.cohort,
    source: args.data.source,
    tokenEmail: args.data.tokenEmail,
    serviceTypes: args.data.serviceTypes,
  }));
});
afterEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXTAUTH_SECRET;
});

describe('cohorts', () => {
  it('knows CLEVELAND_AGENCIES and its landing page', () => {
    expect(isClaimCohort(CLEVELAND_AGENCIES)).toBe(true);
    expect(isClaimCohort('NOPE')).toBe(false);
    expect(isClaimCohort(undefined)).toBe(false);
    expect(COHORT_LANDING_PATH.CLEVELAND_AGENCIES).toBe('/cleveland/home-care-agencies');
  });
});

describe('POST /api/claim/request', () => {
  it('stores a landing-page claim tagged CLEVELAND_AGENCIES (email lowercased)', async () => {
    const res = await POST(req(base));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: 'req-1', cohort: 'CLEVELAND_AGENCIES', source: 'landing_page', verified: false, serviceTypes: 2 });
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    const data = (mockedCreate.mock.calls[0] as any)[0].data;
    expect(data).toMatchObject({
      cohort: 'CLEVELAND_AGENCIES',
      orgName: 'Lakewood Home Care LLC',
      contactEmail: 'dana@lakewoodhomecare.com',
      source: 'landing_page',
      tokenEmail: null,
      serviceTypes: ['Respite care', 'Personal care / companionship'],
    });
  });

  it('a cohort claim link makes it a claim_link claim with the token email, cohort from the token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signClaimToken(
      { operatorEmail: 'Owner@Agency.com', clevelandFounder: false, cohort: 'CLEVELAND_AGENCIES', iat: now, exp: now + 3600 },
      SECRET
    );
    const res = await POST(req({ ...base, token }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ cohort: 'CLEVELAND_AGENCIES', source: 'claim_link', verified: true });
    const data = (mockedCreate.mock.calls[0] as any)[0].data;
    expect(data.source).toBe('claim_link');
    expect(data.tokenEmail).toBe('owner@agency.com');
    expect(data.cohort).toBe('CLEVELAND_AGENCIES');
  });

  it('an operator (home) token or a forged token leaves it a landing-page claim', async () => {
    const now = Math.floor(Date.now() / 1000);
    const homeToken = signClaimToken({ operatorEmail: 'op@x.com', homeId: 'home-1', clevelandFounder: true, iat: now, exp: now + 3600 }, SECRET);
    const forged = signClaimToken({ operatorEmail: 'op@x.com', clevelandFounder: false, cohort: 'CLEVELAND_AGENCIES', iat: now, exp: now + 3600 }, 'other-secret');
    for (const token of [homeToken, forged, 'garbage']) {
      mockedCreate.mockClear();
      const res = await POST(req({ ...base, token }));
      expect(res.status).toBe(201);
      const data = (mockedCreate.mock.calls[0] as any)[0].data;
      expect(data.source).toBe('landing_page');
      expect(data.tokenEmail).toBeNull();
    }
  });

  it('rejects an unknown cohort, a bad email and a missing org name', async () => {
    expect((await POST(req({ ...base, cohort: 'NOPE' }))).status).toBe(400);
    expect((await POST(req({ ...base, contactEmail: 'not-an-email' }))).status).toBe(400);
    expect((await POST(req({ ...base, orgName: '' }))).status).toBe(400);
    expect((await POST(req({ ...base, serviceTypes: ['Not a real service'] }))).status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('swallows honeypot submissions without storing anything', async () => {
    const res = await POST(req({ ...base, company_url: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBeNull();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns 500 (no contact details leaked) when the write fails', async () => {
    mockedCreate.mockRejectedValue(new Error('db down') as never);
    const res = await POST(req(base));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('lakewoodhomecare');
  });
});
