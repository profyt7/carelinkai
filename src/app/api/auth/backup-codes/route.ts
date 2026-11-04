/**
 * 2FA backup codes (P0-2). Only hashes are stored, so codes can never be read back.
 * GET  → how many unused codes remain.
 * POST { code } → regenerate (requires a current authenticator code); new codes returned exactly once.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { errorSummary } from '@/lib/log-safe';
import { decryptTotpSecret, generateBackupCodes, hashBackupCode, isEnrolled, verifyTotp } from '@/lib/two-factor/secure';
import { audit2fa, limited } from '@/lib/two-factor/route-helpers';

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, twoFactorEnabled: true, twoFactorSecret: true, backupCodes: true },
  });
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    if (!isEnrolled(user)) {
      return NextResponse.json({ success: false, message: 'Two-factor authentication must be enabled to manage backup codes' }, { status: 400 });
    }
    const remaining = Array.isArray(user.backupCodes) ? user.backupCodes.length : 0;
    return NextResponse.json({ success: true, data: { remaining } });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { route: 'auth:backup-codes' } });
    console.error('Backup codes retrieval error:', errorSummary(error));
    return NextResponse.json({ success: false, message: 'Failed to retrieve backup codes' }, { status: 500 });
  }
}

const regenSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app') });

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    if (!isEnrolled(user)) {
      return NextResponse.json({ success: false, message: 'Two-factor authentication must be enabled to generate backup codes' }, { status: 400 });
    }
    const parsed = regenSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input data', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    if (limited(`backupcodes:${user.id}`)) {
      return NextResponse.json({ success: false, message: 'Too many attempts. Please try again later.', rateLimit: true }, { status: 429 });
    }
    const dec = decryptTotpSecret(user.twoFactorSecret);
    if (!dec || !verifyTotp(dec.secret, parsed.data.code)) {
      await audit2fa(request, user.id, AuditAction.ACCESS_DENIED, 'Backup code regeneration: invalid code', {}, 'BACKUP_CODES');
      return NextResponse.json({ success: false, message: 'Invalid verification code.' }, { status: 400 });
    }

    const backupCodes = generateBackupCodes();
    await prisma.user.update({ where: { id: user.id }, data: { backupCodes: backupCodes.map(hashBackupCode) } });
    await audit2fa(request, user.id, AuditAction.CREATE, 'Generated new backup codes', { count: backupCodes.length }, 'BACKUP_CODES');

    return NextResponse.json({ success: true, message: 'Backup codes generated successfully', data: { backupCodes, count: backupCodes.length } });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { route: 'auth:backup-codes' } });
    console.error('Backup codes generation error:', errorSummary(error));
    return NextResponse.json({ success: false, message: 'Failed to generate backup codes' }, { status: 500 });
  }
}
