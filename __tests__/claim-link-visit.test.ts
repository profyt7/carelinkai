/**
 * OL-117 tests: claim-link visit tracking. A validly signed token creates an
 * append-only visit row (timestamp + homeId + token email + surface, nothing
 * more); invalid/forged/missing tokens create nothing; the endpoint never
 * reveals token validity and recording failures never surface.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: { claimLinkVisit: { create: jest.fn() } },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { signClaimToken } from '@/lib/claim-token';
import { recordClaimLinkVisit } from '@/lib/claim-engine/claim-link-visit';
import { POST as postVisit } from '@/app/api/claim-link/visit/route';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';

const mockedCreate = prisma.claimLinkVisit.create as jest.Mock;

const SECRET = 'test-secret-for-claim-link-visits';
const payload = {
  operatorEmail: 'Teresa@PleasantViewHealthcare.com',
  homeId: 'home-abc',
  clevelandFounder: true,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 45 * 24 * 3600,
};

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/claim-link/visit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = SECRET;
  mockedCreate.mockResolvedValue({ id: 'visit-1' } as never);
});
afterEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXTAUTH_SECRET;
});

describe('recordClaimLinkVisit', () => {
  it('writes homeId + lowercased email + source, nothing more', async () => {
    await recordClaimLinkVisit({ homeId: 'home-abc', operatorEmail: 'Rebecca@Example.com', source: 'claim_page' });
    expect(mockedCreate).toHaveBeenCalledWith({
      data: { homeId: 'home-abc', operatorEmail: 'rebecca@example.com', source: 'claim_page' },
    });
  });

  it('never throws when the write fails, and keeps email out of the Sentry context', async () => {
    mockedCreate.mockRejectedValue(new Error('db down') as never);
    await expect(
      recordClaimLinkVisit({ homeId: 'home-abc', operatorEmail: 'rebecca@example.com', source: 'claim_page' }),
    ).resolves.toBeUndefined();
    const ctx = JSON.stringify((captureError as jest.Mock).mock.calls[0][1] ?? {});
    expect(ctx).not.toContain('rebecca@example.com');
  });
});

describe('POST /api/claim-link/visit', () => {
  it('records a visit for a validly signed token', async () => {
    const token = signClaimToken(payload, SECRET);
    const res = await postVisit(req({ token, source: 'register_page' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        homeId: 'home-abc',
        operatorEmail: 'teresa@pleasantviewhealthcare.com',
        source: 'register_page',
      },
    });
  });

  it('records NOTHING for a token signed with the wrong secret — same ok response (no validity oracle)', async () => {
    const forged = signClaimToken(payload, 'attacker-secret');
    const res = await postVisit(req({ token: forged, source: 'register_page' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('records nothing for missing/garbage/oversized token bodies', async () => {
    for (const body of [{}, { token: 42 }, { token: 'not-a-token' }, { token: 'x'.repeat(3000) }, 'garbage']) {
      const res = await postVisit(req(body));
      expect(res.status).toBe(200);
    }
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('unknown source values normalize to register_page (never arbitrary strings in the column)', async () => {
    const token = signClaimToken(payload, SECRET);
    await postVisit(req({ token, source: 'evil_injection' }));
    expect((mockedCreate.mock.calls[0][0] as any).data.source).toBe('register_page');
  });

  it('still returns ok when the DB write blows up', async () => {
    mockedCreate.mockRejectedValue(new Error('db down') as never);
    const token = signClaimToken(payload, SECRET);
    const res = await postVisit(req({ token, source: 'register_page' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
