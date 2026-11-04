/**
 * P0-2 (security decision package, Nov 2026): real two-step 2FA, encrypted TOTP secret, hashed backup codes.
 * Before: password alone produced a full session for 2FA users; the secret was stored in plaintext; backup codes
 * were stored and returned in plaintext; /api/profile/2fa flipped the flag with no secret; /api/auth/verify-2fa was
 * an unauthenticated code oracle that also burned backup codes by userId.
 */
import fs from 'fs';
import path from 'path';
import { authenticator } from 'otplib';

const userFindUnique = jest.fn();
const userUpdate = jest.fn(async () => ({}));
const auditCreate = jest.fn(async () => ({}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (a: unknown) => userFindUnique(a), update: (a: unknown) => userUpdate(a) },
    auditLog: { create: (a: unknown) => auditCreate(a) },
  },
}));
jest.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
jest.mock('bcryptjs', () => ({ compare: async (pw: string) => pw === 'correct-password' }));
let sessionEmail: string | null = 'u@example.test';
jest.mock('next-auth/next', () => ({ getServerSession: async () => (sessionEmail ? { user: { email: sessionEmail } } : null) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import {
  consumeBackupCode, decryptTotpSecret, encryptTotpSecret, generateBackupCodes, hashBackupCode, isEnrolled, verifyTotp,
} from '@/lib/two-factor/secure';
import { checkSecondFactor, TWO_FACTOR_REQUIRED } from '@/lib/two-factor/login';

const OLD = process.env;
const SECRET = authenticator.generateSecret();
beforeEach(() => {
  process.env = { ...OLD, NEXTAUTH_SECRET: 'nextauth-secret-for-tests', TWO_FACTOR_ENCRYPTION_KEY: 'dedicated-2fa-key' } as NodeJS.ProcessEnv;
  [userFindUnique, userUpdate, auditCreate].forEach((m) => m.mockReset());
  userUpdate.mockResolvedValue({});
  auditCreate.mockResolvedValue({});
  sessionEmail = 'u@example.test';
});
afterAll(() => { process.env = OLD; });

describe('TOTP secret at rest', () => {
  it('encrypts (no plaintext in the stored value), round-trips, rejects tampering', () => {
    const enc = encryptTotpSecret(SECRET);
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain(SECRET);
    expect(decryptTotpSecret(enc)).toEqual({ secret: SECRET, needsRewrite: false });
    const parts = enc.split(':');
    parts[3] = (parts[3][0] === 'a' ? 'b' : 'a') + parts[3].slice(1);
    expect(decryptTotpSecret(parts.join(':'))).toBeNull();
  });
  it('legacy plaintext is accepted but flagged for rewrite', () => {
    expect(decryptTotpSecret(SECRET)).toEqual({ secret: SECRET, needsRewrite: true });
  });
  it('value written with the NEXTAUTH-derived fallback key still decrypts after a dedicated key is added', () => {
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    const enc = encryptTotpSecret(SECRET);
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'dedicated-2fa-key';
    expect(decryptTotpSecret(enc)).toEqual({ secret: SECRET, needsRewrite: true });
  });
  it('verifyTotp accepts the current code only', () => {
    expect(verifyTotp(SECRET, authenticator.generate(SECRET))).toBe(true);
    expect(verifyTotp(SECRET, '000000') && authenticator.generate(SECRET) !== '000000').toBe(false);
    expect(verifyTotp(SECRET, 'abc')).toBe(false);
  });
});

describe('backup codes', () => {
  it('stored as hashes only; each works once; legacy plaintext lists are re-hashed on use', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    codes.forEach((c) => expect(c).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/));
    const stored = codes.map(hashBackupCode);
    stored.forEach((h, i) => expect(h).not.toContain(codes[i].replace('-', '')));

    const after = consumeBackupCode(stored, codes[3].toLowerCase().replace('-', ' '))!;
    expect(after).toHaveLength(9);
    expect(consumeBackupCode(after, codes[3])).toBeNull();
    expect(consumeBackupCode(stored, 'WRONG-CODES')).toBeNull();

    const legacy = ['AAAAA-BBBBB', 'CCCCC-DDDDD'];
    const left = consumeBackupCode(legacy, 'AAAAA-BBBBB')!;
    expect(left).toEqual([hashBackupCode('CCCCC-DDDDD')]);
  });
});

describe('checkSecondFactor', () => {
  const enrolled = () => ({ id: 'u1', twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(SECRET), backupCodes: ['AAAAA-BBBBB'].map(hashBackupCode) });

  it('flag without a secret (old toggle) is not enrolled', async () => {
    expect(isEnrolled({ twoFactorEnabled: true, twoFactorSecret: null })).toBe(false);
    expect(await checkSecondFactor({ id: 'u1', twoFactorEnabled: true, twoFactorSecret: null }, undefined)).toBe('not-enrolled');
  });
  it('no code → required; wrong code → invalid; no writes', async () => {
    expect(await checkSecondFactor(enrolled(), undefined)).toBe('required');
    expect(await checkSecondFactor(enrolled(), '')).toBe('required');
    const wrong = authenticator.generate(SECRET) === '123456' ? '654321' : '123456';
    expect(await checkSecondFactor(enrolled(), wrong)).toBe('invalid');
    expect(userUpdate).not.toHaveBeenCalled();
  });
  it('valid TOTP → ok; a legacy plaintext secret is re-encrypted', async () => {
    expect(await checkSecondFactor(enrolled(), authenticator.generate(SECRET))).toBe('ok-totp');
    expect(userUpdate).not.toHaveBeenCalled();
    expect(await checkSecondFactor({ ...enrolled(), twoFactorSecret: SECRET }, authenticator.generate(SECRET))).toBe('ok-totp');
    const written = (userUpdate.mock.calls[0][0] as any).data.twoFactorSecret;
    expect(written.startsWith('enc:v1:')).toBe(true);
  });
  it('backup code → ok and removed', async () => {
    expect(await checkSecondFactor(enrolled(), 'aaaaa-bbbbb')).toBe('ok-backup');
    expect((userUpdate.mock.calls[0][0] as any).data.backupCodes).toEqual([]);
  });
});

describe('credentials authorize: password alone never yields a session for a 2FA user', () => {
  const dbUser = () => ({
    id: 'u1', email: 'u@example.test', passwordHash: 'h', firstName: 'T', lastName: 'U', role: 'FAMILY', status: 'ACTIVE',
    emailVerified: new Date(), twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(SECRET), backupCodes: [], lastLoginAt: null,
  });
  const authorize = async (creds: Record<string, string>) => {
    const { authOptions } = await import('@/lib/auth');
    const p: any = authOptions.providers[0];
    return p.options.authorize(creds, { headers: {} });
  };

  it('no code → throws TWO_FACTOR_REQUIRED (no user returned)', async () => {
    userFindUnique.mockResolvedValue(dbUser());
    await expect(authorize({ email: 'u@example.test', password: 'correct-password' })).rejects.toThrow(TWO_FACTOR_REQUIRED);
  });
  it('wrong code → rejected', async () => {
    userFindUnique.mockResolvedValue(dbUser());
    const wrong = authenticator.generate(SECRET) === '111111' ? '222222' : '111111';
    await expect(authorize({ email: 'u@example.test', password: 'correct-password', twoFactorCode: wrong })).rejects.toThrow('Invalid two-factor code');
  });
  it('wrong password with a valid code → rejected before 2FA', async () => {
    userFindUnique.mockResolvedValue(dbUser());
    await expect(authorize({ email: 'u@example.test', password: 'nope', twoFactorCode: authenticator.generate(SECRET) })).rejects.toThrow('Invalid email or password');
  });
  it('valid code → user returned, no requiresTwoFactor partial user', async () => {
    userFindUnique.mockResolvedValue(dbUser());
    const u = await authorize({ email: 'u@example.test', password: 'correct-password', twoFactorCode: authenticator.generate(SECRET) });
    expect(u).toMatchObject({ id: 'u1', email: 'u@example.test' });
    expect(u.requiresTwoFactor).toBeUndefined();
  });
  it('user without 2FA signs in with password only', async () => {
    userFindUnique.mockResolvedValue({ ...dbUser(), twoFactorEnabled: false, twoFactorSecret: null });
    expect(await authorize({ email: 'u@example.test', password: 'correct-password' })).toMatchObject({ id: 'u1' });
  });
});

describe('setup-2fa', () => {
  const req = (body?: unknown) => ({ headers: new Headers(), json: async () => body } as any);

  it('GET stores the pending secret encrypted with the flag still off', async () => {
    userFindUnique.mockResolvedValue({ id: 'u1', email: 'u@example.test', twoFactorEnabled: false, twoFactorSecret: null });
    const { GET } = await import('@/app/api/auth/setup-2fa/route');
    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    const data = (userUpdate.mock.calls[0][0] as any).data;
    expect(data.twoFactorEnabled).toBe(false);
    expect(data.twoFactorSecret.startsWith('enc:v1:')).toBe(true);
    expect(decryptTotpSecret(data.twoFactorSecret)!.secret).toBe(body.data.secret);
  });

  it('POST verifies against the stored secret (a client-supplied secret is ignored), enables, returns codes once, stores hashes', async () => {
    const attacker = authenticator.generateSecret();
    userFindUnique.mockResolvedValue({ id: 'u1', email: 'u@example.test', twoFactorEnabled: false, twoFactorSecret: encryptTotpSecret(SECRET) });
    const { POST } = await import('@/app/api/auth/setup-2fa/route');
    const bad = await POST(req({ token: authenticator.generate(attacker), secret: attacker }));
    if (authenticator.generate(attacker) !== authenticator.generate(SECRET)) expect(bad.status).toBe(400);

    userUpdate.mockClear();
    const ok = await POST(req({ token: authenticator.generate(SECRET) }));
    expect(ok.status).toBe(200);
    const codes: string[] = (await ok.json()).data.backupCodes;
    expect(codes).toHaveLength(10);
    const data = (userUpdate.mock.calls[0][0] as any).data;
    expect(data.twoFactorEnabled).toBe(true);
    expect(data.twoFactorSecret.startsWith('enc:v1:')).toBe(true);
    expect(data.backupCodes).toEqual(codes.map(hashBackupCode));
  });
});

describe('backup-codes GET never returns codes', () => {
  it('returns only the remaining count', async () => {
    userFindUnique.mockResolvedValue({ id: 'u1', twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(SECRET), backupCodes: ['sha256:x', 'sha256:y'] });
    const { GET } = await import('@/app/api/auth/backup-codes/route');
    const body = await (await GET()).json();
    expect(body).toEqual({ success: true, data: { remaining: 2 } });
  });
});

describe('source guards', () => {
  const ROOT = path.join(__dirname, '..');
  it('the unauthenticated verify-2fa oracle and the flag-only toggle are gone', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/app/api/auth/verify-2fa/route.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'src/app/api/profile/2fa/route.ts'))).toBe(false);
  });
  it('nothing writes twoFactorSecret or backupCodes except via the encrypt/hash helpers', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) walk(q); else if (/\.tsx?$/.test(e.name)) files.push(q); } };
    walk(path.join(ROOT, 'src'));
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/twoFactorSecret:\s*([^,}\n]+)/g)) {
        const v = m[1].trim();
        if (v === 'true' || v === 'false') continue; // select/omit flags
        expect({ f: path.relative(ROOT, f), v, ok: /^(encryptTotpSecret\(|null\b)/.test(v) }).toMatchObject({ ok: true });
      }
      for (const m of src.matchAll(/backupCodes:\s*([^,}\n]+)/g)) {
        const v = m[1].trim();
        const ok = ['true', 'false', 'backupCodes.map(hashBackupCode)', 'remaining', 'Prisma.DbNull'].includes(v);
        expect({ f: path.relative(ROOT, f), v, ok }).toMatchObject({ ok: true });
      }
    }
  });
  it('login page handles the second step', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/auth/login/page.tsx'), 'utf8');
    expect(src).toContain('"TWO_FACTOR_REQUIRED"');
    expect(src).toContain('twoFactorCode');
  });
});
