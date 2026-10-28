export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encode } from 'next-auth/jwt';

// DEV-ONLY login helper: mints a NextAuth-compatible session token and sets cookie.
// Assumptions:
// - Enabled only when ALLOW_DEV_ENDPOINTS=1
// - Uses NEXTAUTH_SECRET for signing
// - Uses insecure cookie name in dev when ALLOW_INSECURE_AUTH_COOKIE=1

export async function POST(req: NextRequest) {
  // Allow when explicitly enabled via ALLOW_DEV_ENDPOINTS, regardless of NODE_ENV
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) return NextResponse.json({ error: 'NEXTAUTH_SECRET missing' }, { status: 500 });
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body || {};
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, firstName: true, lastName: true, role: true } });
    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    const token = await encode({
      secret,
      token: {
        id: user.id,
        email: user.email,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
        role: user.role as any,
      } as any,
    } as any);

    const cookieName = ((process.env.NODE_ENV as string) === 'production' && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1')
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: ((process.env.NODE_ENV as string) === 'production') && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error('dev login error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
