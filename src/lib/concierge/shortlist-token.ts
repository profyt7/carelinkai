import crypto from 'crypto';

/**
 * Signed link to a family's released Family Concierge shortlist (pay when ready, 10/31). Mirrors
 * src/lib/pricing/quote-token.ts (HMAC-SHA256 over base64url, signed with NEXTAUTH_SECRET). Carries only
 * the order id and an expiry. The token is necessary but not sufficient: the shortlist page also requires
 * the order to be PAID and released, so a leaked token shows nothing before then.
 */

const DEFAULT_TTL_DAYS = 365;

export interface ShortlistTokenPayload {
  orderId: string;
  iat: number;
  exp: number;
  type: 'concierge_shortlist';
}

function toB64u(s: string): string { return Buffer.from(s).toString('base64url'); }
function fromB64u(s: string): string { return Buffer.from(s, 'base64url').toString('utf-8'); }
function hmac(data: string, secret: string): string { return crypto.createHmac('sha256', secret).update(data).digest('base64url'); }

export function signShortlistToken(orderId: string, secret: string, opts?: { ttlDays?: number }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ShortlistTokenPayload = { orderId, iat: now, exp: now + (opts?.ttlDays ?? DEFAULT_TTL_DAYS) * 24 * 3600, type: 'concierge_shortlist' };
  const data = toB64u(JSON.stringify(payload));
  return `${data}.${hmac(data, secret)}`;
}

export function verifyShortlistToken(token: string, secret: string): ShortlistTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = hmac(data as string, secret);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig as string, 'base64url'), Buffer.from(expected, 'base64url'))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64u(data as string)) as ShortlistTokenPayload;
    if (payload.type !== 'concierge_shortlist' || !payload.orderId) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SHORTLIST_PATH_PREFIX = '/concierge/shortlist/';

/** The family sees their shortlist only once the order is marked PAID and an admin released it. */
export function isShortlistVisibleToFamily(order: { status: string; shortlistReleasedAt: Date | string | null } | null | undefined): boolean {
  return !!order && order.status === 'PAID' && !!order.shortlistReleasedAt;
}
