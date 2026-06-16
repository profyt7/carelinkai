import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Whether the current requester may be shown mock/demo data.
 *
 * - Non-production (dev / preview / staging): always allowed — mocks are a
 *   development affordance.
 * - Production: ADMINs only. This ensures a stray `carelink_mock_mode` cookie
 *   or a `SHOW_SITE_MOCKS` env var can never leak sample providers/caregivers
 *   (e.g. "Golden Years Home Care, San Francisco") to real families on prod.
 *
 * Pair this with `isMockModeEnabled()` (which decides whether mock data is
 * *requested* via cookie/env): only serve mocks when both are true.
 *
 * Server-only — imports NextAuth/Prisma, so do not import from Edge/middleware.
 */
export async function isMockViewerAllowed(): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.role === 'ADMIN';
  } catch {
    return false;
  }
}
