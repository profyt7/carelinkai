/**
 * Disable 2FA (P0-2). Requires the current password or a current authenticator / backup code.
 * Clears the secret and backup codes.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AuditAction, Prisma } from '@prisma/client';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { errorSummary } from '@/lib/log-safe';
import { consumeBackupCode, decryptTotpSecret, verifyTotp } from '@/lib/two-factor/secure';
import { audit2fa, clientIp, limited } from '@/lib/two-factor/route-helpers';
import { twoFactorEnforced } from '@/lib/auth/session-guard';
import { roleMayNotDisableTwoFactor } from '@/lib/auth/two-factor-routes';
import { endOtherSessions } from '@/lib/auth/session-version';

const disableSchema = z.object({
  verificationMethod: z.enum(['password', 'totp']),
  verificationValue: z.string().min(1, 'Verification value is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });

    const parsed = disableSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input data', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { verificationMethod, verificationValue } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, passwordHash: true, twoFactorEnabled: true, twoFactorSecret: true, backupCodes: true },
    });
    if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    if (!user.twoFactorEnabled) {
      return NextResponse.json({ success: false, message: 'Two-factor authentication is not enabled for this account' }, { status: 400 });
    }

    // Security package §3: these roles must keep 2FA on.
    if (twoFactorEnforced() && roleMayNotDisableTwoFactor(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Two-factor authentication is required for your account role and cannot be turned off.' },
        { status: 403 },
      );
    }

    if (limited(`disable2fa:${clientIp(request)}:${user.id}`)) {
      await audit2fa(request, user.id, AuditAction.ACCESS_DENIED, '2FA disable attempt rate limit exceeded', { method: 'DISABLE_2FA', reason: 'RATE_LIMIT' });
      return NextResponse.json({ success: false, message: 'Too many verification attempts. Please try again later.', rateLimit: true }, { status: 429 });
    }

    let verified = false;
    if (verificationMethod === 'password') {
      verified = !!user.passwordHash && (await compare(verificationValue, user.passwordHash));
    } else {
      const dec = decryptTotpSecret(user.twoFactorSecret);
      verified = (!!dec && verifyTotp(dec.secret, verificationValue)) || !!consumeBackupCode(user.backupCodes, verificationValue);
    }

    if (!verified) {
      await audit2fa(request, user.id, AuditAction.ACCESS_DENIED, 'Failed 2FA disable verification', { method: 'DISABLE_2FA', verificationMethod, reason: 'INVALID_CREDENTIALS' });
      return NextResponse.json(
        { success: false, message: `Invalid ${verificationMethod === 'password' ? 'password' : 'verification code'}. Please try again.` },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodes: Prisma.DbNull },
    });
    await audit2fa(request, user.id, AuditAction.UPDATE, 'Two-factor authentication disabled', { method: 'DISABLE_2FA', verificationMethod });

    // Turning 2FA off ends other sessions; this device stays signed in.
    const res = NextResponse.json({ success: true, message: 'Two-factor authentication has been successfully disabled for your account' });
    await endOtherSessions(request, res, user.id);
    return res;
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { route: 'auth:disable-2fa' } });
    console.error('Disable 2FA error:', errorSummary(error));
    return NextResponse.json({ success: false, message: 'Failed to disable two-factor authentication' }, { status: 500 });
  }
}
