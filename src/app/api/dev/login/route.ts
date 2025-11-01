import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';

// Dev-only helper to set a NextAuth session cookie for a given user email.
// Assumptions (dev/test only):
// - JWT session strategy is used (as configured in authOptions)
// - NEXTAUTH_SECRET is set
// - Intended for localhost/testing environments; never enable in production
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ ok: false, message: 'Only available in development' }, { status: 403 });
  }

  const prisma = new PrismaClient();
  try {
    const body = await request.json().catch(() => ({} as any));
    const email: string = (body.email as string)?.toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, message: 'email required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
      }
    });

    if (!user) {
      return NextResponse.json({ ok: false, message: 'user not found' }, { status: 404 });
    }

    const secret = process.env['NEXTAUTH_SECRET'];
    if (!secret) {
      return NextResponse.json({ ok: false, message: 'NEXTAUTH_SECRET not set' }, { status: 500 });
    }

    // Craft a NextAuth-compatible JWT payload mirroring our session claims
    const tokenPayload: Record<string, any> = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      iat: Math.floor(Date.now() / 1000),
      // 30 days expiry to align with auth options
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    const jwt = await encode({
      secret,
      token: tokenPayload,
      maxAge: 30 * 24 * 60 * 60,
    } as any);

    // Cookie name matches NextAuth defaults
    const cookieName = process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName, jwt, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      // For localhost dev and e2e on http, do not require secure
      secure: process.env.NODE_ENV === 'production' && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1',
      maxAge: 30 * 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    console.error('dev/login error', e);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
