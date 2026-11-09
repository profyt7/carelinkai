/**
 * 2FA enrolment (P0-2).
 *
 * GET  → returns the pending TOTP secret (generating and storing it ENCRYPTED on first call; twoFactorEnabled stays false;
 *        later calls reuse it so the QR never changes under the user),
 *        returns the QR code + the secret for manual entry.
 * POST { token } → verifies the code against the stored pending secret (never a client-supplied secret),
 *        turns 2FA on, and returns 10 backup codes exactly once (only hashes are stored).
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import * as QRCode from 'qrcode';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { errorSummary } from '@/lib/log-safe';
import {
  decryptTotpSecret, encryptTotpSecret, generateBackupCodes, generateTotpSecret, hashBackupCode, isEnrolled, totpKeyUri, verifyTotp,
} from '@/lib/two-factor/secure';
import { audit2fa, limited } from '@/lib/two-factor/route-helpers';

const verifySchema = z.object({ token: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits') });

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, twoFactorEnabled: true, twoFactorSecret: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    if (isEnrolled(user)) {
      return NextResponse.json({ success: false, message: 'Two-factor authentication is already enabled for this account' }, { status: 400 });
    }

    // Idempotent: reuse a pending (not yet confirmed) secret, so a second GET — a re-render,
    // a second tab, a reload — shows the same QR instead of silently replacing the secret
    // the user just scanned (which made their first code "invalid").
    const pending = !user.twoFactorEnabled ? decryptTotpSecret(user.twoFactorSecret) : null;
    const secret = pending?.secret ?? generateTotpSecret();
    const otpAuthUrl = totpKeyUri(user.email, secret);
    const qrCode = await QRCode.toDataURL(otpAuthUrl, { width: 220, margin: 4 });

    // Pending secret: stored encrypted, flag stays off until a code proves the app is set up.
    if (!pending || pending.needsRewrite || user.twoFactorEnabled) {
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: encryptTotpSecret(secret) } });
    }
    await audit2fa(request, user.id, AuditAction.READ, 'Generated 2FA setup QR code', { method: 'TOTP_SETUP', step: 'GENERATE_QR' });

    return NextResponse.json({ success: true, message: 'Two-factor authentication setup initiated', data: { secret, qrCode, otpAuthUrl } });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { route: 'auth:setup-2fa' } });
    console.error('2FA setup error:', errorSummary(error));
    return NextResponse.json({ success: false, message: 'Failed to initiate 2FA setup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });

    const parsed = verifySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input data', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    if (isEnrolled(user)) {
      return NextResponse.json({ success: false, message: 'Two-factor authentication is already enabled for this account' }, { status: 400 });
    }
    if (limited(`setup2fa:${user.id}`)) {
      return NextResponse.json({ success: false, message: 'Too many attempts. Please try again later.', rateLimit: true }, { status: 429 });
    }

    const pending = decryptTotpSecret(user.twoFactorSecret);
    if (!pending) {
      return NextResponse.json({ success: false, message: 'Start setup first.' }, { status: 400 });
    }
    if (!verifyTotp(pending.secret, parsed.data.token)) {
      await audit2fa(request, user.id, AuditAction.ACCESS_DENIED, 'Failed 2FA setup verification', { method: 'TOTP_SETUP', step: 'VERIFY', reason: 'INVALID_TOKEN' });
      return NextResponse.json({ success: false, message: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    const backupCodes = generateBackupCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptTotpSecret(pending.secret),
        backupCodes: backupCodes.map(hashBackupCode),
      },
    });
    await audit2fa(request, user.id, AuditAction.UPDATE, 'Two-factor authentication enabled', { method: 'TOTP_SETUP', step: 'COMPLETE' });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been successfully enabled for your account',
      data: { backupCodes },
    });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { route: 'auth:setup-2fa' } });
    console.error('2FA setup verification error:', errorSummary(error));
    return NextResponse.json({ success: false, message: 'Failed to verify and enable 2FA' }, { status: 500 });
  }
}
