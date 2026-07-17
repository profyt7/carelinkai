/**
 * fix/resend-bounce-suppression — pre-send syntax + MX validation gate.
 */

import { jest } from '@jest/globals';

const resolveMx = jest.fn();
const lookup = jest.fn();
jest.mock('dns', () => ({ promises: { resolveMx: (...a: any[]) => resolveMx(...a), lookup: (...a: any[]) => lookup(...a) } }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { isValidEmailSyntax, hasDeliverableDomain, validateEmailForSend, domainOf, _clearMxCache } from '@/lib/email/validate';

beforeEach(() => {
  jest.clearAllMocks();
  _clearMxCache();
});

describe('isValidEmailSyntax', () => {
  it('accepts normal addresses', () => {
    for (const e of ['a@b.com', 'first.last@sub.hospital.org', 'x+tag@gmail.com', 'Name@Domain.CO'])
      expect(isValidEmailSyntax(e)).toBe(true);
  });
  it('rejects the junk scrapes produce', () => {
    for (const e of ['', 'nope', 'a@b', 'a@@b.com', 'a b@c.com', 'a@b..com', 'a@.com', '@b.com', 'a@b.c', 'a@b_c.com'])
      expect(isValidEmailSyntax(e)).toBe(false);
  });
  it('rejects over-long local part / address', () => {
    expect(isValidEmailSyntax('a'.repeat(65) + '@b.com')).toBe(false);
    expect(isValidEmailSyntax('a'.repeat(250) + '@b.com')).toBe(false);
  });
});

describe('domainOf', () => {
  it('extracts the domain lowercased', () => {
    expect(domainOf('Foo@Bar.COM')).toBe('bar.com');
  });
});

describe('hasDeliverableDomain', () => {
  it('true when MX records exist', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx1.example.com', priority: 10 }]);
    expect(await hasDeliverableDomain('example.com')).toBe(true);
  });
  it('falls back to A record when no MX (NODATA)', async () => {
    resolveMx.mockRejectedValue(Object.assign(new Error('no mx'), { code: 'ENODATA' }));
    lookup.mockResolvedValue({ address: '1.2.3.4', family: 4 });
    expect(await hasDeliverableDomain('a-only.com')).toBe(true);
  });
  it('false for a non-existent domain (NXDOMAIN, no A)', async () => {
    resolveMx.mockRejectedValue(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }));
    lookup.mockRejectedValue(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }));
    expect(await hasDeliverableDomain('totally-not-real-xyz.com')).toBe(false);
  });
  it('fails OPEN on a transient/timeout error', async () => {
    resolveMx.mockRejectedValue(Object.assign(new Error('temp'), { code: 'ESERVFAIL' }));
    expect(await hasDeliverableDomain('flaky.com')).toBe(true);
  });
  it('memoizes per domain (one DNS call for repeats)', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx', priority: 1 }]);
    await hasDeliverableDomain('cached.com');
    await hasDeliverableDomain('cached.com');
    expect(resolveMx).toHaveBeenCalledTimes(1);
  });
});

describe('validateEmailForSend', () => {
  it('rejects bad syntax before any DNS call', async () => {
    const res = await validateEmailForSend('not-an-email');
    expect(res).toEqual({ ok: false, reason: 'invalid_syntax' });
    expect(resolveMx).not.toHaveBeenCalled();
  });
  it('rejects a good-syntax address on a dead domain', async () => {
    resolveMx.mockRejectedValue(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }));
    lookup.mockRejectedValue(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }));
    expect(await validateEmailForSend('real.syntax@dead-domain-xyz.com')).toEqual({ ok: false, reason: 'no_mx' });
  });
  it('passes a deliverable address', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx', priority: 1 }]);
    expect(await validateEmailForSend('ok@good.com')).toEqual({ ok: true });
  });
});
