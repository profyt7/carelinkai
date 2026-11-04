/**
 * P0-2: second-factor check used by the credentials provider.
 * Before: with 2FA on and no code, `authorize` returned the user and a full session was issued (password alone
 * was enough). Now no session is issued until a valid TOTP or backup code is presented.
 */
import { prisma } from '@/lib/prisma';
import { consumeBackupCode, decryptTotpSecret, encryptTotpSecret, isEnrolled, verifyTotp } from './secure';

/** Error message the login page recognises to show the code step. */
export const TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED';

export type SecondFactorResult = 'not-enrolled' | 'required' | 'ok-totp' | 'ok-backup' | 'invalid';

export async function checkSecondFactor(
  user: { id: string; twoFactorEnabled?: boolean | null; twoFactorSecret?: string | null; backupCodes?: unknown },
  code: string | undefined | null,
): Promise<SecondFactorResult> {
  if (!isEnrolled(user)) return 'not-enrolled';
  if (!code || !String(code).trim()) return 'required';

  const dec = decryptTotpSecret(user.twoFactorSecret);
  if (dec && verifyTotp(dec.secret, code)) {
    if (dec.needsRewrite) {
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: encryptTotpSecret(dec.secret) } });
    }
    return 'ok-totp';
  }

  const remaining = consumeBackupCode(user.backupCodes, String(code));
  if (remaining) {
    await prisma.user.update({ where: { id: user.id }, data: { backupCodes: remaining } });
    return 'ok-backup';
  }
  return 'invalid';
}
