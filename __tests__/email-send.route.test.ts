/**
 * OL-166d — POST /api/email/send goes through Resend (the single
 * suppression-guarded choke point in src/lib/email.ts), same payload /
 * behavior as before: 401 without a session, 400 on an invalid body, custom
 * emails sent with the configured from / reply-to, bulk is admin / staff only.
 * Nothing is actually sent: guardedResendSend is mocked.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const getServerSession = jest.fn();
jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
const guardedResendSend = jest.fn();
jest.mock('@/lib/email', () => ({ guardedResendSend: (...a: unknown[]) => guardedResendSend(...a) }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { POST } from '@/app/api/email/send/route';

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/email/send', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env['RESEND_API_KEY'] = 'unit';
  process.env['EMAIL_FROM'] = 'noreply@getcarelinkai.com';
  process.env['EMAIL_FROM_NAME'] = 'CareLinkAI';
  process.env['EMAIL_REPLY_TO'] = 'support@getcarelinkai.com';
  guardedResendSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
});

describe('POST /api/email/send (Resend)', () => {
  it('401 without a session', async () => {
    getServerSession.mockResolvedValue(null);
    const r = await post({ type: 'custom', to: 'a@b.co', subject: 'x', html: '<p>x</p>' });
    expect(r.status).toBe(401);
    expect(guardedResendSend).not.toHaveBeenCalled();
  });

  it('400 on an invalid body', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } });
    const r = await post({ type: 'custom', to: 'not-an-email', subject: '', html: '' });
    expect(r.status).toBe(400);
    expect(guardedResendSend).not.toHaveBeenCalled();
  });

  it('custom email → one Resend send with the configured from / reply-to, html + stripped text, category tag', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } });
    const r = await post({ type: 'custom', to: 'family@example.com', subject: 'Test Email from CareLinkAI Admin Tools', html: '<p>hello</p>' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ success: true, messageId: 'msg_1' });
    expect(guardedResendSend).toHaveBeenCalledTimes(1);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, unknown>;
    expect(args).toMatchObject({
      from: 'CareLinkAI <noreply@getcarelinkai.com>',
      to: ['family@example.com'],
      replyTo: 'support@getcarelinkai.com',
      subject: 'Test Email from CareLinkAI Admin Tools',
      html: '<p>hello</p>',
      text: 'hello',
      tags: [{ name: 'category', value: 'carelinkai' }],
    });
  });

  it('template email (notification) renders the branded wrapper and slugs the category tag', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'FAMILY' } });
    const r = await post({
      type: 'notification',
      to: { email: 'family@example.com', name: 'Fam' },
      subject: 'Heads up',
      templateData: { firstName: 'Pat', message: 'Your tour is tomorrow.', actionUrl: 'https://getcarelinkai.com/x', actionText: 'Open', category: 'Tour Reminders' },
    });
    expect(r.status).toBe(200);
    const args = guardedResendSend.mock.calls[0][0] as Record<string, unknown>;
    expect(args['to']).toEqual(['family@example.com']);
    expect(String(args['html'])).toContain('Your tour is tomorrow.');
    expect(String(args['html'])).toContain('CareLinkAI');
    expect(args['tags']).toEqual([
      { name: 'category', value: 'notification' },
      { name: 'category', value: 'tour-reminders' },
    ]);
  });

  it('a provider error is reported, not thrown', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } });
    guardedResendSend.mockResolvedValue({ data: null, error: { message: 'domain not verified', name: 'validation_error' } });
    const r = await post({ type: 'custom', to: 'family@example.com', subject: 'x', html: '<p>x</p>' });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.success).toBe(false);
  });

  it('bulk is admin / staff only; each email is sent once', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'FAMILY' } });
    const forbidden = await post({ emails: [{ type: 'custom', to: 'a@example.com', subject: 'x', html: '<p>x</p>' }] });
    expect(forbidden.status).toBe(403);
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } });
    const ok = await post({
      emails: [
        { type: 'custom', to: 'a@example.com', subject: 'x', html: '<p>x</p>' },
        { type: 'custom', to: 'b@example.com', subject: 'y', html: '<p>y</p>' },
      ],
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).summary).toEqual({ total: 2, successful: 2, failed: 0 });
    expect(guardedResendSend).toHaveBeenCalledTimes(2);
  });

  it('missing RESEND_API_KEY → send refused, nothing called', async () => {
    delete process.env['RESEND_API_KEY'];
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } });
    const r = await post({ type: 'custom', to: 'family@example.com', subject: 'x', html: '<p>x</p>' });
    expect((await r.json()).success).toBe(false);
    expect(guardedResendSend).not.toHaveBeenCalled();
  });
});
