/**
 * CARELINK-AI-19: a logged-out GET /api/operator/inquiries/pipeline must answer
 * 401 JSON and send NOTHING to Sentry. Two layers are tested:
 *
 *  1. the route short-circuits auth errors before captureError();
 *  2. captureError() itself refuses Unauthenticated/Unauthorized errors, so the
 *     other routes that still call it first (convert, status) are covered too.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// ---- layer 1: route -------------------------------------------------------
const sentryMock = { captureError: jest.fn(), isExpectedAuthError: jest.requireActual<any>('@/lib/sentry').isExpectedAuthError };
jest.mock('@/lib/sentry', () => sentryMock);
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn(async () => null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: { inquiry: { groupBy: jest.fn(), findMany: jest.fn() }, family: { findUnique: jest.fn() } },
}));
jest.mock('@/lib/services/inquiry-conversion', () => ({ getConversionStats: jest.fn() }));

import { getServerSession } from 'next-auth/next';
import { GET as pipelineGET } from '@/app/api/operator/inquiries/pipeline/route';

const session = getServerSession as jest.Mock;

describe('GET /api/operator/inquiries/pipeline logged-out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    session.mockResolvedValue(null);
  });

  it('returns 401 JSON and does not call captureError', async () => {
    const res = await pipelineGET(new NextRequest('http://localhost/api/operator/inquiries/pipeline'));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({ error: 'You must be logged in to access this resource' });
    expect(sentryMock.captureError).not.toHaveBeenCalled();
  });

  it('returns 403 JSON (no Sentry) for a signed-in role without the permission', async () => {
    session.mockResolvedValue({ user: { id: 'u1', email: 'cg@example.com', role: 'CAREGIVER', firstName: 'C', lastName: 'G' } });
    const res = await pipelineGET(new NextRequest('http://localhost/api/operator/inquiries/pipeline'));
    expect(res.status).toBe(403);
    expect(sentryMock.captureError).not.toHaveBeenCalled();
  });
});

// ---- layer 2: captureError itself ----------------------------------------
describe('captureError ignores expected auth errors', () => {
  it('UnauthenticatedError / UnauthorizedError never reach Sentry; real errors do', async () => {
    jest.resetModules();
    const captureException = jest.fn();
    jest.doMock('@sentry/nextjs', () => ({
      withScope: (fn: (scope: any) => void) => fn({ setTag: jest.fn(), setExtras: jest.fn(), setUser: jest.fn(), setLevel: jest.fn() }),
      captureException,
      captureMessage: jest.fn(),
      getClient: jest.fn(() => ({})),
      setUser: jest.fn(),
      addBreadcrumb: jest.fn(),
      startInactiveSpan: jest.fn(),
    }));
    const { captureError, isExpectedAuthError } = jest.requireActual<any>('@/lib/sentry');
    const { UnauthenticatedError, UnauthorizedError } = await import('@/lib/auth-utils');

    captureError(new UnauthenticatedError('nope'));
    captureError(new UnauthorizedError('nope'));
    // cross-bundle instance: same name, different class
    const foreign = Object.assign(new Error('x'), { name: 'UnauthenticatedError' });
    captureError(foreign);
    expect(captureException).not.toHaveBeenCalled();
    expect(isExpectedAuthError(foreign)).toBe(true);
    expect(isExpectedAuthError(new Error('boom'))).toBe(false);
    expect(isExpectedAuthError(null)).toBe(false);

    captureError(new Error('boom'));
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
