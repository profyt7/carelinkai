/**
 * OL-160 — cron auth helper + failure classifier:
 *  - fails CLOSED when CRON_SECRET is unset (the reminders routes used to pass
 *    `undefined !== undefined`);
 *  - accepts Bearer and the legacy x-cron-secret header; mismatch / missing
 *    header are distinct, logged reasons; the secret never appears in a
 *    reason, a log line or the 401 body;
 *  - classifyCronFailure names "auth 401 — CRON_SECRET mismatch" vs
 *    "5xx — app error";
 *  - the DP follow-ups + reminders routes return a generic 401 through it.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/dp-outreach/dp-followup', () => ({ advanceDpSequences: jest.fn(async () => ({ advanced: 0 })) }));
jest.mock('@/lib/services/reminders', () => ({
  processDueScheduledNotifications: jest.fn(async () => ({ processed: 0, sent: 0, failed: 0, durationMs: 1 })),
  scheduleUpcomingAppointmentReminders: jest.fn(async () => ({ scheduled: 0, scanned: 0, skippedExisting: 0, durationMs: 1 })),
}));

import { checkCronAuth, classifyCronFailure, cronUnauthorized, CRON_AUTH_LOG } from '@/lib/cron-auth';
import { GET as dpFollowups } from '@/app/api/cron/dp-followups/route';
import { POST as remindersProcess } from '@/app/api/cron/reminders/process/route';
import { POST as remindersSchedule } from '@/app/api/cron/reminders/schedule/route';

const SECRET = 'cron_secret_value_123';
const headers = (h: Record<string, string>) => new Headers(h);

describe('checkCronAuth', () => {
  it('fails closed when CRON_SECRET is unset or blank, whatever the caller sends', () => {
    expect(checkCronAuth(headers({ authorization: 'Bearer anything' }), {})).toMatchObject({ ok: false, status: 401, reason: 'secret_unset' });
    expect(checkCronAuth(headers({ 'x-cron-secret': 'anything' }), { CRON_SECRET: '  ' })).toMatchObject({ ok: false, reason: 'secret_unset' });
    expect(checkCronAuth(headers({}), {})).toMatchObject({ ok: false, reason: 'secret_unset' });
  });
  it('accepts the matching Bearer or x-cron-secret header', () => {
    expect(checkCronAuth(headers({ authorization: `Bearer ${SECRET}` }), { CRON_SECRET: SECRET })).toEqual({ ok: true });
    expect(checkCronAuth(headers({ authorization: `bearer   ${SECRET}` }), { CRON_SECRET: SECRET })).toEqual({ ok: true });
    expect(checkCronAuth(headers({ 'x-cron-secret': SECRET }), { CRON_SECRET: SECRET })).toEqual({ ok: true });
  });
  it('distinguishes a missing header from a mismatch, and never leaks the secret', () => {
    const missing = checkCronAuth(headers({}), { CRON_SECRET: SECRET });
    const wrong = checkCronAuth(headers({ authorization: 'Bearer nope' }), { CRON_SECRET: SECRET });
    const prefix = checkCronAuth(headers({ authorization: `Bearer ${SECRET}x` }), { CRON_SECRET: SECRET });
    expect(missing).toMatchObject({ ok: false, reason: 'missing_header' });
    expect(wrong).toMatchObject({ ok: false, reason: 'mismatch', log: CRON_AUTH_LOG.mismatch });
    expect(prefix).toMatchObject({ ok: false, reason: 'mismatch' });
    for (const r of [missing, wrong, prefix]) expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(CRON_AUTH_LOG.mismatch).toBe('auth 401 — CRON_SECRET mismatch (caller sent a different value)');
  });
  it('cronUnauthorized logs the reason (not the secret) and returns a generic 401 body', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = checkCronAuth(headers({ authorization: 'Bearer nope' }), { CRON_SECRET: SECRET });
    if (r.ok) throw new Error('expected failure');
    expect(cronUnauthorized('dp-followups', r)).toEqual({ body: { error: 'Unauthorized' }, status: 401 });
    expect(warn).toHaveBeenCalledWith('[cron] dp-followups: auth 401 — CRON_SECRET mismatch (caller sent a different value)');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);
    warn.mockRestore();
  });
});

describe('classifyCronFailure', () => {
  it('names auth vs app error vs client error vs unreachable', () => {
    expect(classifyCronFailure(200)).toEqual({ kind: 'ok', message: 'ok' });
    expect(classifyCronFailure(401).message).toBe('auth 401 — CRON_SECRET mismatch (or not set on the server)');
    expect(classifyCronFailure(403).kind).toBe('auth');
    expect(classifyCronFailure(500)).toMatchObject({ kind: 'app_error', message: expect.stringMatching(/^500 — app error \(5xx\)/) });
    expect(classifyCronFailure(503).kind).toBe('app_error');
    expect(classifyCronFailure(404).kind).toBe('client_error');
    expect(classifyCronFailure(0).kind).toBe('unreachable');
  });
});

describe('cron routes use the helper (fail closed, generic 401)', () => {
  const ORIGINAL = process.env['CRON_SECRET'];
  let warn: jest.SpiedFunction<typeof console.warn>;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); if (ORIGINAL === undefined) delete process.env['CRON_SECRET']; else process.env['CRON_SECRET'] = ORIGINAL; });

  it('dp-followups: 401 + reason logged when unset or wrong; 200 when right', async () => {
    delete process.env['CRON_SECRET'];
    const r1 = await dpFollowups(new NextRequest('http://localhost/api/cron/dp-followups', { headers: { authorization: 'Bearer x' } }));
    expect(r1.status).toBe(401);
    expect(await r1.json()).toEqual({ error: 'Unauthorized' });
    expect(warn.mock.calls.at(-1)?.[0]).toContain('CRON_SECRET is not set');
    process.env['CRON_SECRET'] = SECRET;
    const r2 = await dpFollowups(new NextRequest('http://localhost/api/cron/dp-followups', { headers: { authorization: 'Bearer wrong' } }));
    expect(r2.status).toBe(401);
    expect(warn.mock.calls.at(-1)?.[0]).toContain('CRON_SECRET mismatch');
    const r3 = await dpFollowups(new NextRequest('http://localhost/api/cron/dp-followups', { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(r3.status).toBe(200);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);
  });

  it('reminders schedule/process: an unset CRON_SECRET no longer lets an unauthenticated POST through', async () => {
    delete process.env['CRON_SECRET'];
    const req = () => new NextRequest('http://localhost/api/cron/reminders/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect((await remindersSchedule(req())).status).toBe(401);
    expect((await remindersProcess(req())).status).toBe(401);
    process.env['CRON_SECRET'] = SECRET;
    const ok = () => new NextRequest('http://localhost/api/cron/reminders/x', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': SECRET }, body: '{}' });
    expect((await remindersSchedule(ok())).status).toBe(200);
    expect((await remindersProcess(ok())).status).toBe(200);
  });
});
