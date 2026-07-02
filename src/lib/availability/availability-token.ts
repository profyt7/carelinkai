import crypto from 'crypto';

/**
 * Signed magic-link token for the no-login availability updater (email channel).
 * Mirrors src/lib/unsubscribe-token.ts (HMAC-SHA256 over a base64url payload,
 * signed with NEXTAUTH_SECRET). Carries the homeId and an expiry so a leaked link
 * can't update a facility's availability forever. The token only ever lets someone
 * set a small integer openings count on ONE home — no PHI, no account access.
 */

const DEFAULT_TTL_DAYS = 30;

export interface AvailabilityTokenPayload {
  homeId: string;
  iat: number;
  exp: number;
  type: 'availability';
}

function toBase64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}
function fromBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}
function hmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/** Sign an availability magic-link token for a home. Returns `<data>.<signature>`. */
export function signAvailabilityToken(homeId: string, secret: string, ttlDays = DEFAULT_TTL_DAYS): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AvailabilityTokenPayload = {
    homeId,
    iat: now,
    exp: now + ttlDays * 24 * 3600,
    type: 'availability',
  };
  const data = toBase64url(JSON.stringify(payload));
  return `${data}.${hmac(data, secret)}`;
}

/** Verify an availability token. Returns the payload, or null if invalid/expired. */
export function verifyAvailabilityToken(token: string, secret: string): AvailabilityTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = hmac(data as string, secret);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig as string, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64url(data as string)) as AvailabilityTokenPayload;
    if (payload.type !== 'availability' || !payload.homeId) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
