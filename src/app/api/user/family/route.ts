export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';

// DEV-friendly endpoint to get or create a Family for the current user
// Assumptions:
// - In production, this should be protected by auth; for dev/tests we allow JWT cookie decode
// - If no family exists, create an empty Family tied to the user

export async function GET(_req: NextRequest) {
  try {
    let userId: string | undefined;
    // Try to read from dev JWT cookie when allowed
    if (process.env['ALLOW_DEV_ENDPOINTS'] === '1') {
      try {
        const jar = cookies();
        const cookieName = (process.env.NODE_ENV === 'production' && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1')
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token';
        const raw = jar.get(cookieName)?.value;
        if (raw) {
          const token: any = await decode({ token: raw, secret: process.env['NEXTAUTH_SECRET']! } as any);
          userId = token?.id as string | undefined;
        }
      } catch {}
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let fam = await prisma.family.findUnique({ where: { userId }, select: { id: true } });
    if (!fam) {
      fam = await prisma.family.create({ data: { userId }, select: { id: true } });
    }
    return NextResponse.json({ familyId: fam.id });
  } catch (e) {
    console.error('user family error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
