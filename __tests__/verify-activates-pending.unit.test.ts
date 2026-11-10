/**
 * An account with emailVerified set but status still PENDING could never sign in:
 * authorize said "Please verify your email", the emailed link said "already verified",
 * and "resend" said the same. /api/admin/verify-user-email produced exactly that state
 * (it set emailVerified, never status). Now:
 *   - the admin route activates a PENDING account when it verifies it;
 *   - /api/auth/verify-email activates a verified-but-PENDING account (self-heal);
 *   - /api/auth/send-verification sends such an account a fresh link instead of
 *     "already verified".
 */
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const findUnique = jest.fn();
const findFirst = jest.fn();
const update = jest.fn(async (a: any) => ({ id: 'u1', email: 'pat@example.test', ...a.data }));
const auditCreate = jest.fn(async () => ({}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (a: unknown) => findUnique(a), findFirst: (a: unknown) => findFirst(a), update: (a: any) => update(a) },
    auditLog: { create: (a: unknown) => auditCreate(a) },
  },
}));
let role: string | null = 'ADMIN';
jest.mock('next-auth', () => ({ getServerSession: async () => (role ? { user: { id: 'admin1', role } } : null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

beforeEach(() => {
  [findUnique, findFirst, update, auditCreate].forEach((m) => m.mockClear());
  role = 'ADMIN';
});

describe('POST /api/admin/verify-user-email', () => {
  const post = (body: unknown) => new NextRequest('http://localhost/api/admin/verify-user-email', { method: 'POST', body: JSON.stringify(body) });

  it('activates a PENDING account when verifying it (was: left PENDING → could never sign in)', async () => {
    findUnique.mockResolvedValue({ id: 'u1', email: 'pat@example.test', status: 'PENDING', emailVerified: null, role: 'FAMILY' });
    const { POST } = await import('@/app/api/admin/verify-user-email/route');
    const res = await POST(post({ email: 'pat@example.test' }));
    expect(res.status).toBe(200);
    expect(update.mock.calls[0][0].data).toMatchObject({ status: 'ACTIVE', emailVerified: expect.any(Date) });
  });

  it('does not reactivate a SUSPENDED or DEACTIVATED account', async () => {
    for (const status of ['SUSPENDED', 'DEACTIVATED']) {
      update.mockClear();
      findUnique.mockResolvedValue({ id: 'u1', email: 'pat@example.test', status, emailVerified: null, role: 'FAMILY' });
      const { POST } = await import('@/app/api/admin/verify-user-email/route');
      await POST(post({ email: 'pat@example.test' }));
      expect(update.mock.calls[0][0].data.status).toBeUndefined();
    }
  });

  it('still admin-only', async () => {
    role = 'FAMILY';
    const { POST } = await import('@/app/api/admin/verify-user-email/route');
    expect((await POST(post({ email: 'pat@example.test' }))).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/verify-email — already verified', () => {
  let ip = 0;
  const get = () => new NextRequest(`http://localhost/api/auth/verify-email?token=${'t'.repeat(40)}`, { headers: { 'x-forwarded-for': `198.51.100.${++ip}` } });

  it('verified but still PENDING → activated (self-heal)', async () => {
    findFirst.mockResolvedValue({ id: 'u1', email: 'pat@example.test', emailVerified: new Date(), status: 'PENDING', verificationTokenExpiry: new Date(Date.now() + 3600_000) });
    const { GET } = await import('@/app/api/auth/verify-email/route');
    const res = await GET(get());
    expect(await res.json()).toMatchObject({ verified: true, alreadyVerified: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: expect.objectContaining({ status: 'ACTIVE' }) }));
  });

  it('verified and ACTIVE → nothing written', async () => {
    findFirst.mockResolvedValue({ id: 'u1', email: 'pat@example.test', emailVerified: new Date(), status: 'ACTIVE', verificationTokenExpiry: new Date(Date.now() + 3600_000) });
    const { GET } = await import('@/app/api/auth/verify-email/route');
    const body = await (await GET(get())).json();
    expect(body).toMatchObject({ verified: true, alreadyVerified: true }); // reached the branch under test
    expect(update).not.toHaveBeenCalled();
  });

  it('verified but DEACTIVATED → not reactivated', async () => {
    findFirst.mockResolvedValue({ id: 'u1', email: 'pat@example.test', emailVerified: new Date(), status: 'DEACTIVATED', verificationTokenExpiry: new Date(Date.now() + 3600_000) });
    const { GET } = await import('@/app/api/auth/verify-email/route');
    const body = await (await GET(get())).json();
    expect(body).toMatchObject({ verified: true, alreadyVerified: true }); // reached the branch under test
    expect(update).not.toHaveBeenCalled();
  });
});

describe('source guards', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  it('both already-verified branches in verify-email self-heal PENDING', () => {
    expect(read('src/app/api/auth/verify-email/route.ts').match(/if \(user\.status === UserStatus\.PENDING\)/g)?.length).toBe(2);
  });
  it('send-verification only says "already verified" when the account is not PENDING', () => {
    expect(read('src/app/api/auth/send-verification/route.ts')).toContain('if (user.emailVerified && user.status !== UserStatus.PENDING)');
  });
});
