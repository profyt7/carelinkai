/**
 * /settings/account audit.
 * - "Log Out From All Other Devices" deleted rows from the Session table, which JWT
 *   sessions never use, so it signed nobody out. It now bumps the session version
 *   and re-issues this device's cookie.
 * - Notification Preferences never saved (the page sent { preferences: {...} }, the
 *   API's schema has no such key and stripped it, then answered "saved"), and nothing
 *   reads those flags. The section is removed.
 * - The account API's "activeSessions" list came from the same unused table.
 */
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { encode, decode } from 'next-auth/jwt';

const findUnique = jest.fn();
const update = jest.fn();
const auditCreate = jest.fn(async () => ({}));
const sessionDeleteMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (a: unknown) => findUnique(a), update: (a: unknown) => update(a) },
    auditLog: { create: (a: unknown) => auditCreate(a) },
    session: { deleteMany: (a: unknown) => sessionDeleteMany(a) },
  },
}));
let sessionUser: { email: string } | null = { email: 'pat@example.test' };
jest.mock('next-auth', () => ({ getServerSession: async () => (sessionUser ? { user: sessionUser } : null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const SECRET = 'test-secret-settings-account';
const OLD = process.env;
beforeEach(() => {
  process.env = { ...OLD, NEXTAUTH_SECRET: SECRET } as NodeJS.ProcessEnv;
  [findUnique, update, auditCreate, sessionDeleteMany].forEach((m) => m.mockReset());
  sessionUser = { email: 'pat@example.test' };
});
afterAll(() => { process.env = OLD; });

describe('DELETE /api/profile/sessions (Log Out From All Other Devices)', () => {
  it('bumps the session version and keeps this device signed in', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    update.mockResolvedValue({ sessionVersion: 4 });
    const cookie = await encode({ token: { id: 'u1', sv: 3 }, secret: SECRET });
    const { DELETE } = await import('@/app/api/profile/sessions/route');
    const res = await DELETE(new NextRequest('http://localhost/api/profile/sessions', {
      method: 'DELETE', headers: { cookie: `next-auth.session-token=${cookie}` },
    }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: { sessionVersion: { increment: 1 } } }));
    const reissued: any = await decode({ token: res.cookies.get('next-auth.session-token')!.value, secret: SECRET });
    expect(reissued).toMatchObject({ id: 'u1', sv: 4 });
    expect(sessionDeleteMany).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalled();
  });

  it('401 without a session; nothing bumped', async () => {
    sessionUser = null;
    const { DELETE } = await import('@/app/api/profile/sessions/route');
    const res = await DELETE(new NextRequest('http://localhost/api/profile/sessions', { method: 'DELETE' }));
    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('/settings/account page', () => {
  const ROOT = path.join(__dirname, '..');
  const page = fs.readFileSync(path.join(ROOT, 'src/app/settings/account/page.tsx'), 'utf8');

  it('no longer shows the Notification Preferences controls that never saved', () => {
    expect(page).not.toMatch(/Notification Preferences/);
    expect(page).not.toMatch(/\/api\/profile\/preferences/);
    for (const id of ['emailNotifications', 'securityAlerts', 'marketingEmails', 'accountUpdates']) expect(page).not.toContain(id);
  });

  it('keeps the controls that work end to end', () => {
    expect(page).toContain('Log Out From All Other Devices');
    expect(page).toContain('fetch("/api/profile/sessions"');
    expect(page).toContain('fetch("/api/profile/password"');
    expect(page).toContain('fetch("/api/profile/deactivate"');
    expect(page).toContain('<TwoFactorPanel');
  });

  it('the account API no longer reads the unused Session table', () => {
    const api = fs.readFileSync(path.join(ROOT, 'src/app/api/profile/account/route.ts'), 'utf8');
    expect(api).not.toMatch(/prisma\.session\./);
    expect(api).not.toContain('activeSessions');
  });
});
