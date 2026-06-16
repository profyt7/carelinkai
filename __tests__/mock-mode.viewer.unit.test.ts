import { getServerSession } from 'next-auth';
import { isMockViewerAllowed } from '@/lib/mockMode.server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockGetSession = getServerSession as jest.Mock;

const origEnv = process.env.NODE_ENV;
function setEnv(v: string) {
  Object.defineProperty(process.env, 'NODE_ENV', { value: v, configurable: true });
}
afterEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { value: origEnv, configurable: true });
  jest.clearAllMocks();
});

describe('isMockViewerAllowed', () => {
  it('allows everyone outside production (dev/preview/staging)', async () => {
    setEnv('development');
    mockGetSession.mockResolvedValue(null);
    await expect(isMockViewerAllowed()).resolves.toBe(true);
    // session is never even consulted off-prod
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('allows a prod ADMIN', async () => {
    setEnv('production');
    mockGetSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    await expect(isMockViewerAllowed()).resolves.toBe(true);
  });

  it('blocks a prod non-admin (e.g. FAMILY) even with a mock cookie', async () => {
    setEnv('production');
    mockGetSession.mockResolvedValue({ user: { role: 'FAMILY' } });
    await expect(isMockViewerAllowed()).resolves.toBe(false);
  });

  it('blocks an unauthenticated prod visitor', async () => {
    setEnv('production');
    mockGetSession.mockResolvedValue(null);
    await expect(isMockViewerAllowed()).resolves.toBe(false);
  });

  it('fails closed if the session lookup throws in prod', async () => {
    setEnv('production');
    mockGetSession.mockRejectedValue(new Error('boom'));
    await expect(isMockViewerAllowed()).resolves.toBe(false);
  });
});
