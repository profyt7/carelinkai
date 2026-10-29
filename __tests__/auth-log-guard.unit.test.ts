/**
 * OL-231: auth and signup code logs outcome codes only, never an email address, user id, name,
 * IP, token or link. These fail if:
 *   - any console/logger call in src/lib/auth*.ts, src/app/api/auth/** or src/app/auth/** prints
 *     anything but fixed text or errorSummary(err) (scripts/pii-log-scan.cjs, strict rule);
 *   - the verification / password-reset senders in src/lib/email.ts do;
 *   - a real credentials sign-in (unknown user, wrong password) logs the email, user id or IP.
 */
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { hashSync } from 'bcryptjs';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn(async () => ({})) },
  },
}));

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const scanner = require('../scripts/pii-log-scan.cjs') as {
  AUTH_SCOPE: string[];
  authFiles: () => string[];
  scanAuth: () => Array<{ file: string; line: number; reasons: string[]; text: string }>;
  scanStrictSource: (file: string, text: string, range?: [number, number]) => Array<{ reasons: string[] }>;
};

describe('auth log guard (static)', () => {
  it('covers the auth library, every /api/auth route and the auth pages', () => {
    const files = scanner.authFiles().map((f) => path.relative(process.cwd(), f));
    for (const must of [
      'src/lib/auth.ts',
      'src/lib/auth-db-simple.ts',
      'src/lib/auth-utils.ts',
      'src/app/api/auth/register/route.ts',
      'src/app/api/auth/forgot-password/route.ts',
      'src/app/api/auth/reset-password/route.ts',
      'src/app/api/auth/resend-verification/route.ts',
      'src/app/api/auth/send-verification/route.ts',
      'src/app/api/auth/verify-2fa/route.ts',
      'src/app/auth/login/page.tsx',
      'src/app/auth/register/page.tsx',
    ]) {
      expect(files).toContain(must);
    }
  });

  it('every log call in auth / signup code prints fixed text or errorSummary() only', () => {
    expect(scanner.scanAuth().map((h) => `${h.file}:${h.line} [${h.reasons.join(', ')}] ${h.text}`)).toEqual([]);
  });

  it.each(['sendVerificationEmail', 'sendPasswordResetEmail'])('src/lib/email.ts %s logs outcome codes only', (fn) => {
    const file = 'src/lib/email.ts';
    const text = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const start = text.indexOf(`export async function ${fn}(`);
    expect(start).toBeGreaterThan(-1);
    const next = text.indexOf('\nexport ', start + 1);
    const hits = scanner.scanStrictSource(file, text, [start, next === -1 ? text.length : next]);
    expect(hits).toEqual([]);
  });

  it.each([
    "console.log('[auth] authorize called for', credentials?.email);",
    "console.warn('[auth] Failed login', { email, ip: req.headers['x-forwarded-for'] });",
    'console.log(`[createVerificationToken] Generating token for userId=${userId}`);',
    "console.log('[REGISTER API] User created successfully, id:', user.id);",
    "console.error('[RESET PASSWORD] Error:', error);",
    "console.error('Error message:', error.message);",
    "console.log('[REGISTER API] Raw body:', JSON.stringify(redactSecrets(rawBody)));",
  ])('flags %s', (code) => {
    expect(scanner.scanStrictSource('src/app/api/auth/x/route.ts', code).length).toBe(1);
  });

  it.each([
    "console.warn('[auth] login failed: user not found');",
    "console.error('[RESET PASSWORD] Error:', errorSummary(error));",
    'console.log(`[registration] Verification e-mail queued`);',
  ])('allows %s', (code) => {
    expect(scanner.scanStrictSource('src/app/api/auth/x/route.ts', code)).toEqual([]);
  });
});

describe('auth log guard (behaviour): a real credentials sign-in logs no identifiers', () => {
  const EMAIL = 'jane.doe.ol231@example.com';
  const USER_ID = 'cmuserol231abcdef';
  const IP = '203.0.113.77';
  const findUnique = prisma.user.findUnique as unknown as jest.Mock;
  let logged: string[] = [];
  const spies: Array<{ mockRestore: () => void }> = [];

  const authorize = (password: string) => {
    const provider = authOptions.providers[0] as unknown as {
      options: { authorize: (c: Record<string, string>, r: unknown) => Promise<unknown> };
    };
    return provider.options.authorize({ email: EMAIL.toUpperCase(), password }, { headers: { 'x-forwarded-for': IP } });
  };

  beforeEach(() => {
    logged = [];
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      spies.push(jest.spyOn(console, m).mockImplementation((...args: unknown[]) => { logged.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); }));
    }
  });
  afterEach(() => {
    spies.splice(0).forEach((s) => s.mockRestore());
    findUnique.mockReset();
  });

  const expectNoIdentifiers = () => {
    const out = logged.join('\n').toLowerCase();
    for (const id of [EMAIL, USER_ID, IP, 'jane']) expect(out).not.toContain(id.toLowerCase());
  };

  it('unknown user: rejects, logs an outcome, no email or IP', async () => {
    findUnique.mockResolvedValue(null as never);
    await expect(authorize('whatever')).rejects.toThrow('Invalid email or password');
    expect(logged.join('\n')).toContain('login failed: user not found');
    expectNoIdentifiers();
  });

  it('wrong password: rejects, no email, user id or IP in the logs', async () => {
    findUnique.mockResolvedValue({
      id: USER_ID, email: EMAIL, passwordHash: hashSync('right-password', 4), firstName: 'Jane', lastName: 'Doe',
      role: 'FAMILY', status: 'ACTIVE', emailVerified: new Date(), twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [], lastLoginAt: null,
    } as never);
    await expect(authorize('wrong-password')).rejects.toThrow('Invalid email or password');
    expectNoIdentifiers();
  });
});
