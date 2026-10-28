/**
 * fix/resend-bounce-suppression — Resend bounce/complaint webhook.
 *
 * Verifies: valid signature → hard bounce & complaint auto-suppress; transient
 * (soft) bounces are ignored; invalid signature → 400; missing signature in
 * production → 400. Resend's verify + the suppression writer are mocked.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const verify = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ webhooks: { verify } })) }));
jest.mock('@/lib/email/suppression', () => ({ addSuppressions: jest.fn() }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { POST } from '@/app/api/webhooks/resend/route';
import { addSuppressions } from '@/lib/email/suppression';

const addMock = addSuppressions as jest.Mock;

function req(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'svix-id': 'msg_1', 'svix-timestamp': '1', 'svix-signature': 'v1,sig', ...headers },
    body: JSON.stringify(body),
  });
}

const OLD_ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV, NODE_ENV: 'production', RESEND_WEBHOOK_SECRET: 'whsec_test', RESEND_API_KEY: 're_x' } as any;
  addMock.mockResolvedValue(1 as never);
});
afterAll(() => { process.env = OLD_ENV; });

describe('POST /api/webhooks/resend', () => {
  it('suppresses a hard bounce', async () => {
    const event = { type: 'email.bounced', data: { to: ['bad@x.com'], bounce: { type: 'Permanent' } } };
    verify.mockReturnValue(event);
    const res = await POST(req(event));
    expect(res.status).toBe(200);
    expect(addMock).toHaveBeenCalledWith(['bad@x.com'], 'bounce', 'resend-webhook');
  });

  it('suppresses a complaint (overwrites milder reasons)', async () => {
    const event = { type: 'email.complained', data: { to: 'spam@x.com' } };
    verify.mockReturnValue(event);
    await POST(req(event));
    expect(addMock).toHaveBeenCalledWith(['spam@x.com'], 'complaint', 'resend-webhook', { overwriteReason: true });
  });

  it('ignores a transient (soft) bounce', async () => {
    const event = { type: 'email.bounced', data: { to: ['temp@x.com'], bounce: { type: 'Transient' } } };
    verify.mockReturnValue(event);
    const res = await POST(req(event));
    expect(res.status).toBe(200);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('no-ops (200) on unrelated events like delivered', async () => {
    const event = { type: 'email.delivered', data: { to: ['ok@x.com'] } };
    verify.mockReturnValue(event);
    const res = await POST(req(event));
    expect(res.status).toBe(200);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid signature', async () => {
    verify.mockImplementation(() => { throw new Error('signature mismatch'); });
    const res = await POST(req({ type: 'email.bounced', data: { to: ['x@y.com'] } }));
    expect(res.status).toBe(400);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('returns 400 in production when the signature header is missing', async () => {
    const res = await POST(req({ type: 'email.bounced' }, { 'svix-signature': '' }));
    expect(res.status).toBe(400);
    expect(verify).not.toHaveBeenCalled();
  });
});
