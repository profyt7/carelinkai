export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';

/**
 * Protected ping endpoint used by post-deploy synthetics.
 * Returns 200 when a valid NextAuth session is present.
 * If a role is present on the session, it is echoed back.
 * No database lookups are required for success.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
    }
    const role = (session.user as any).role ?? null;
    const email = (session.user as any).email ?? null;
    return NextResponse.json({ ok: true, role, email });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
