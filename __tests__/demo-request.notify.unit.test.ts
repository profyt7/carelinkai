/**
 * Homepage walkthrough form → POST /api/demo-request → DemoRequest row + one email to
 * ADMIN_NOTIFY_EMAIL (Resend via sendEmail, mocked here; nothing sends). The form promises a
 * reply within one business day, so a failed notification must reach Sentry.
 */
import { NextRequest } from 'next/server';

const sendEmail = jest.fn();
jest.mock('@/lib/email/transactional', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a), escapeHtml: (s: string) => s }));
const captureError = jest.fn();
jest.mock('@/lib/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
jest.mock('@/lib/consent/lead-consent', () => ({ recordLeadConsent: jest.fn(async () => undefined) }));
jest.mock('@/lib/prisma', () => ({ prisma: { demoRequest: { create: jest.fn(async ({ data }: any) => ({ id: 'demo_1', ...data })) } } }));

import { POST } from '@/app/api/demo-request/route';

const req = () =>
  new NextRequest('http://localhost/api/demo-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Dana Example', email: 'dana@example.com', company: 'Pleasant Pointe', role: 'Operator', consent: true }),
  });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  process.env['ADMIN_NOTIFY_EMAIL'] = 'chris@example.com';
});

it('emails ADMIN_NOTIFY_EMAIL once per request', async () => {
  sendEmail.mockResolvedValue({ success: true });
  const r = await POST(req());
  expect(r.status).toBe(200);
  await flush();
  expect(sendEmail).toHaveBeenCalledTimes(1);
  const args = sendEmail.mock.calls[0][0] as Record<string, unknown>;
  expect(args['to']).toBe('chris@example.com');
  expect(String(args['subject'])).toContain('Dana Example (Pleasant Pointe)');
  expect(captureError).not.toHaveBeenCalled();
});

it('a failed send is reported to Sentry; the visitor still gets 200', async () => {
  sendEmail.mockResolvedValue({ success: false, error: new Error('domain not verified') });
  const r = await POST(req());
  expect(r.status).toBe(200);
  await flush();
  expect(captureError).toHaveBeenCalledTimes(1);
  expect(captureError.mock.calls[0][1]).toMatchObject({ tags: { feature: 'demo-request' }, extra: { demoRequestId: 'demo_1' } });
});
