/**
 * Ending sessions: bump User.sessionVersion so every existing token fails the jwt
 * callback's check (src/lib/auth/session-guard.ts). When the caller should stay
 * signed in on THIS device (password change, "log out other devices"), the route
 * re-issues the caller's own cookie carrying the new version.
 */
import type { NextRequest, NextResponse } from 'next/server';
import { encode, getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // matches authOptions.session.maxAge

export function sessionCookieName(env: NodeJS.ProcessEnv = process.env): string {
  return env.NODE_ENV === 'production' && env.ALLOW_INSECURE_AUTH_COOKIE !== '1'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

/** Ends every session of this user (all devices). Returns the new version. */
export async function bumpSessionVersion(userId: string): Promise<number> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return u.sessionVersion;
}

/**
 * Re-issue the caller's session cookie with `sv = sessionVersion`, so the device
 * that made the request stays signed in after a bump. Returns false when the
 * request carries no valid session cookie (nothing to keep).
 */
export async function reissueSessionCookie(req: NextRequest, res: NextResponse, sessionVersion: number): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  const cookieName = sessionCookieName();
  const token = await getToken({ req, secret, cookieName });
  if (!token) return false;
  const value = await encode({ token: { ...token, sv: sessionVersion }, secret, maxAge: SESSION_MAX_AGE });
  const secure = cookieName.startsWith('__Secure-');
  res.cookies.set(cookieName, value, { httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: SESSION_MAX_AGE });
  return true;
}

/** Bump the version (ending other sessions) and keep the caller's own session. */
export async function endOtherSessions(req: NextRequest, res: NextResponse, userId: string): Promise<number> {
  const sv = await bumpSessionVersion(userId);
  await reissueSessionCookie(req, res, sv);
  return sv;
}
