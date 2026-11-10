/**
 * Send-guard: .test, carelinkai.com (not our domain) and the carelinkai.system sentinel are never mailed.
 * Seed/demo addresses moved to .test keep their demo / non-demo classification.
 */
import { jest } from '@jest/globals';

const send = jest.fn(async (_a: any, _o?: any) => ({ data: { id: 'em_1' }, error: null, headers: null }));
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send } })) }));

import { isBlockedRecipient, guardRecipients, createGuardedResend } from '@/lib/email/recipient-guard';
import { DEMO_EMAIL_RE } from '@/lib/admin/demo-identity';
import { readFileSync } from 'fs';
import { join } from 'path';

beforeEach(() => send.mockClear());

describe('isBlockedRecipient', () => {
  it.each([
    'operator+seed@carelinkai.test', 'admin@seed.carelinkai.test', 'x@test.carelinkai.test', 'a@example.test',
    'admin@carelinkai.com', 'OPERATOR+SEED@CarelinkAI.com', 'op@test.carelinkai.com',
    'directory-unclaimed@carelinkai.system', 'Olivia <operator+seed@carelinkai.com>', ' family.seed1@carelinkai.com ',
  ])('blocks %s', (a) => expect(isBlockedRecipient(a)).toBe(true));

  it.each([
    'chris@getcarelinkai.com', 'placements@getcarelinkai.com', 'profyt7+cltest@gmail.com', 'family@example.com',
    'someone@notcarelinkai.com', 'a@test.com', 'CareLinkAI <noreply@getcarelinkai.com>',
  ])('allows %s', (a) => expect(isBlockedRecipient(a)).toBe(false));

  it('ignores non-strings and addresses without a domain', () => {
    expect(isBlockedRecipient(null)).toBe(false);
    expect(isBlockedRecipient(undefined)).toBe(false);
    expect(isBlockedRecipient('nope')).toBe(false);
  });
});

describe('guardRecipients', () => {
  it('passes args through untouched when nothing is blocked', () => {
    const a = { to: ['a@example.com'], subject: 's' };
    expect(guardRecipients(a)).toEqual({ args: a, blocked: 0 });
  });
  it('drops blocked to/cc/bcc and keeps the rest', () => {
    const { args, blocked } = guardRecipients({ to: ['a@example.com', 'admin@carelinkai.com'], cc: 'x@seed.carelinkai.test', bcc: ['b@example.com'] });
    expect(blocked).toBe(2);
    expect(args).toEqual({ to: ['a@example.com'], cc: [], bcc: ['b@example.com'] });
  });
  it('returns null (skip) when no to recipient is left', () => {
    expect(guardRecipients({ to: 'operator+seed@carelinkai.com', cc: ['ok@example.com'] }).args).toBeNull();
  });
});

describe('createGuardedResend', () => {
  it('skips the send entirely for a blocked-only recipient and reads as success', async () => {
    const r = createGuardedResend('re_dummy');
    const out = await r.emails.send({ from: 'n@getcarelinkai.com', to: 'operator+seed@carelinkai.com', subject: 'Hi', text: 't' } as any);
    expect(send).not.toHaveBeenCalled();
    expect(out).toMatchObject({ data: null, error: null });
  });
  it('sends to the remaining recipients only', async () => {
    const r = createGuardedResend('re_dummy');
    await r.emails.send({ from: 'n@getcarelinkai.com', to: ['real@example.com', 'x@carelinkai.test'], subject: 'Hi', text: 't' } as any);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toEqual(['real@example.com']);
  });
  it('every Resend client in src goes through the guard (no bare `new Resend(`)', () => {
    const { execSync } = require('child_process') as typeof import('child_process');
    const hits = execSync("git grep -n 'new Resend(' -- src", { cwd: join(__dirname, '..'), encoding: 'utf8' })
      .split('\n').filter(Boolean)
      .filter((l) => !l.startsWith('src/lib/email/recipient-guard.ts') && !/^\S+:\d+:\s*\/\//.test(l));
    expect(hits).toEqual([]);
  });
});

describe('seed/demo addresses keep their classification after the move to .test', () => {
  it.each(['operator+seed@carelinkai.test', 'family.seed1@carelinkai.test', 'x-1@test.carelinkai.test', 'demo.op@carelinkai.test',
    'operator+seed@carelinkai.com', 'family.seed2@carelinkai.com', 'op@test.carelinkai.com'])('%s is demo', (e) => expect(DEMO_EMAIL_RE.test(e)).toBe(true));
  it.each(['admin@seed.carelinkai.test', 'operator.test@seed.carelinkai.test', 'operator+e2e@seed.carelinkai.test', 'admin@carelinkai.com'])(
    '%s is not demo (same as before)', (e) => expect(DEMO_EMAIL_RE.test(e)).toBe(false));
  it('runDemoSeed no longer creates @carelinkai.com accounts', () => {
    expect(readFileSync(join(__dirname, '../src/lib/demoSeed.ts'), 'utf8')).not.toMatch(/@carelinkai\.com/);
  });
});
