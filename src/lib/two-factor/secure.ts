/**
 * P0-2 (security decision package, Nov 2026): 2FA secrets at rest and backup codes.
 *
 * - TOTP secret: AES-256-GCM, stored as `enc:v1:<iv>:<ciphertext>:<tag>` (hex). Key = TWO_FACTOR_ENCRYPTION_KEY,
 *   falling back to a key derived (HKDF) from NEXTAUTH_SECRET so no new env var is required to deploy.
 *   Decrypt tries every configured key, so moving from the fallback to a dedicated key is seamless
 *   (values re-encrypt with the primary key on next successful use).
 * - Backup codes: only SHA-256 hashes are stored (`sha256:<hex>`). The codes are 50 random bits each, so a fast
 *   hash is sufficient; plaintext is shown to the user exactly once.
 * - Legacy rows (plaintext secret / plaintext codes written before this fix) are still accepted and rewritten
 *   in the new format on first successful use — no data migration needed.
 */
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { authenticator } from 'otplib';

authenticator.options = { digits: 6, step: 30, window: 1 };

const ENC_PREFIX = 'enc:v1:';
const HASH_PREFIX = 'sha256:';

function deriveKey(material: string, info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', Buffer.from(material, 'utf8'), Buffer.alloc(0), Buffer.from(info, 'utf8'), 32));
}

/** Ordered list of keys: primary first. */
function keys(): Buffer[] {
  const out: Buffer[] = [];
  const dedicated = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  const nextauth = process.env.NEXTAUTH_SECRET;
  if (dedicated) out.push(deriveKey(dedicated, 'carelinkai-2fa-v1'));
  if (nextauth) out.push(deriveKey(nextauth, 'carelinkai-2fa-v1-nextauth'));
  if (!out.length) throw new Error('2FA encryption key not configured (TWO_FACTOR_ENCRYPTION_KEY or NEXTAUTH_SECRET)');
  return out;
}

export function isEncryptedSecret(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(ENC_PREFIX);
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys()[0], iv);
  const ct = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${ENC_PREFIX}${iv.toString('hex')}:${ct.toString('hex')}:${cipher.getAuthTag().toString('hex')}`;
}

/**
 * Returns the plaintext secret plus whether the stored value should be rewritten
 * (legacy plaintext, or encrypted with a non-primary key). null if it cannot be decrypted.
 */
export function decryptTotpSecret(stored: string | null | undefined): { secret: string; needsRewrite: boolean } | null {
  if (!stored) return null;
  if (!isEncryptedSecret(stored)) return { secret: stored, needsRewrite: true };
  const [ivHex, ctHex, tagHex] = stored.slice(ENC_PREFIX.length).split(':');
  if (!ivHex || !ctHex || !tagHex) return null;
  const ks = keys();
  for (let i = 0; i < ks.length; i++) {
    try {
      const d = createDecipheriv('aes-256-gcm', ks[i], Buffer.from(ivHex, 'hex'));
      d.setAuthTag(Buffer.from(tagHex, 'hex'));
      const secret = Buffer.concat([d.update(Buffer.from(ctHex, 'hex')), d.final()]).toString('utf8');
      return { secret, needsRewrite: i !== 0 };
    } catch {
      /* try next key */
    }
  }
  return null;
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpKeyUri(account: string, secret: string): string {
  return authenticator.keyuri(account, 'CareLinkAI', secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  const token = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function normalizeBackupCode(code: string): string {
  return String(code || '').replace(/[\s-]/g, '').toUpperCase();
}

/** 10 codes formatted XXXXX-XXXXX (50 bits each). */
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const s = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

export function hashBackupCode(code: string): string {
  return HASH_PREFIX + createHash('sha256').update(normalizeBackupCode(code)).digest('hex');
}

function safeEq(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Finds a backup code in the stored list (hashed, or legacy plaintext).
 * Returns the remaining list — all hashed — with the used code removed, or null if no match.
 */
export function consumeBackupCode(stored: unknown, code: string): string[] | null {
  if (!Array.isArray(stored) || !code) return null;
  const n = normalizeBackupCode(code);
  if (n.length < 8) return null;
  const want = hashBackupCode(n);
  let matched = -1;
  stored.forEach((entry, i) => {
    if (typeof entry !== 'string') return;
    const asHash = entry.startsWith(HASH_PREFIX) ? entry : hashBackupCode(entry);
    if (safeEq(asHash, want) && matched === -1) matched = i;
  });
  if (matched === -1) return null;
  return stored
    .filter((e, i) => i !== matched && typeof e === 'string')
    .map((e) => ((e as string).startsWith(HASH_PREFIX) ? (e as string) : hashBackupCode(e as string)));
}

/** A user is enrolled only if the flag is on AND a secret exists (the old toggle could set the flag alone). */
export function isEnrolled(u: { twoFactorEnabled?: boolean | null; twoFactorSecret?: string | null }): boolean {
  return !!u.twoFactorEnabled && !!u.twoFactorSecret;
}
