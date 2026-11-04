/**
 * P0-7 (security decision package, Nov 2026): every Twilio webhook verifies X-Twilio-Signature.
 * Before: sms / status / voice / voice/accept accepted any POST (voice/accept had no auth at all), so a forged
 * request could confirm or decline a shift, mark attempts failed, or read a shift's home and times by attemptId.
 */
import fs from 'fs';
import path from 'path';
import { twilioSignature, verifyTwilioRequest } from '@/lib/twilio/verify-webhook';

const findUnique = jest.fn(async () => null);
const findFirst = jest.fn(async () => null);
const update = jest.fn();
const handleCaregiverReply = jest.fn(async () => ({ action: 'none', needId: null }));
jest.mock('@/lib/prisma', () => ({ prisma: { coverageAttempt: { findUnique: () => findUnique(), findFirst: () => findFirst(), update: (a: unknown) => update(a) } } }));
jest.mock('@/lib/oncall/dispatcher', () => ({ handleCaregiverReply: (...a: unknown[]) => handleCaregiverReply(...(a as [])) }));

const TOKEN = 'test_auth_token_123';
const BASE = 'https://getcarelinkai.com';
const OLD = process.env;
beforeEach(() => {
  process.env = { ...OLD, TWILIO_AUTH_TOKEN: TOKEN, NEXT_PUBLIC_APP_URL: BASE, NEXTAUTH_URL: BASE, NODE_ENV: 'production' } as NodeJS.ProcessEnv;
  [findUnique, findFirst, update, handleCaregiverReply].forEach((m) => m.mockClear());
});
afterAll(() => { process.env = OLD; });

const post = (pathAndQuery: string, form: Record<string, string>, sig?: string) =>
  new Request(BASE + pathAndQuery, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(sig ? { 'x-twilio-signature': sig } : {}) },
    body: new URLSearchParams(form).toString(),
  });

describe('twilioSignature matches the official twilio library', () => {
  it('same signature as twilio.validateRequest expects', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    const url = `${BASE}/api/webhooks/twilio/voice/accept?attemptId=a1`;
    const params = { Digits: '1', CallSid: 'CA123', From: '+15555550100' };
    const sig = twilioSignature(TOKEN, url, params);
    expect(twilio.validateRequest(TOKEN, sig, url, params)).toBe(true);
    expect(twilio.validateRequest(TOKEN, sig, url, { ...params, Digits: '2' })).toBe(false);
  });
});

describe('verifyTwilioRequest', () => {
  it('valid signature → ok with params; missing or wrong → 403', async () => {
    const form = { MessageSid: 'SM1', Body: 'YES' };
    const good = twilioSignature(TOKEN, `${BASE}/api/webhooks/twilio/sms`, form);
    const ok = await verifyTwilioRequest(post('/api/webhooks/twilio/sms', form, good));
    expect(ok).toEqual({ ok: true, params: form });
    for (const sig of [undefined, 'bogus', twilioSignature('other_token', `${BASE}/api/webhooks/twilio/sms`, form)]) {
      const r = await verifyTwilioRequest(post('/api/webhooks/twilio/sms', form, sig));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(403);
    }
  });
  it('the query string is part of the signed URL', async () => {
    const form = { Digits: '1' };
    const sigForOther = twilioSignature(TOKEN, `${BASE}/api/webhooks/twilio/voice/accept?attemptId=OTHER`, form);
    const r = await verifyTwilioRequest(post('/api/webhooks/twilio/voice/accept?attemptId=a1', form, sigForOther));
    expect(r.ok).toBe(false);
  });
  it('production without TWILIO_AUTH_TOKEN fails closed (503); dev without it passes', async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const r = await verifyTwilioRequest(post('/api/webhooks/twilio/sms', { Body: 'x' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(503);
    (process.env as any).NODE_ENV = 'development';
    expect((await verifyTwilioRequest(post('/api/webhooks/twilio/sms', { Body: 'x' }))).ok).toBe(true);
  });
});

describe('routes reject unsigned requests and do nothing', () => {
  it.each([
    ['sms', '/api/webhooks/twilio/sms', { MessageSid: 'SM1', Body: 'YES' }],
    ['status', '/api/webhooks/twilio/status', { MessageSid: 'SM1', MessageStatus: 'failed' }],
    ['voice', '/api/webhooks/twilio/voice?attemptId=a1', { CallSid: 'CA1' }],
    ['voice/accept', '/api/webhooks/twilio/voice/accept?attemptId=a1', { Digits: '1' }],
  ])('%s: unsigned → 403, no DB read/write, no shift action', async (name, p, form) => {
    const mod = await import(`@/app/api/webhooks/twilio/${name}/route`);
    const res = await mod.POST(post(p, form as Record<string, string>) as any);
    expect(res.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(handleCaregiverReply).not.toHaveBeenCalled();
  });

  it('voice/accept: a correctly signed request still works', async () => {
    const form = { Digits: '2' };
    const sig = twilioSignature(TOKEN, `${BASE}/api/webhooks/twilio/voice/accept?attemptId=a1`, form);
    const mod = await import('@/app/api/webhooks/twilio/voice/accept/route');
    const res = await mod.POST(post('/api/webhooks/twilio/voice/accept?attemptId=a1', form, sig) as any);
    expect(res.status).toBe(200);
    expect(findUnique).toHaveBeenCalled();
  });

  it('source guard: every Twilio webhook route verifies the signature', () => {
    const ROOT = path.join(__dirname, '..', 'src/app/api/webhooks/twilio');
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) walk(q); else if (e.name === 'route.ts') files.push(q); } };
    walk(ROOT);
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      expect({ f: path.relative(ROOT, f), ok: /verifyTwilioRequest\(req\)|twilio\.validateRequest\(/.test(src) }).toEqual({ f: path.relative(ROOT, f), ok: true });
    }
  });
});
