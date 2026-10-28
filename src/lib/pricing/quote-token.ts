import crypto from 'crypto';

/**
 * Signed magic-link token for the no-login post-tour family QUOTE survey. Mirrors
 * src/lib/availability/availability-token.ts (HMAC-SHA256 over base64url, signed with
 * NEXTAUTH_SECRET). Carries the homeId (+ optional inquiryId to dedupe) and an expiry.
 * The token only lets someone submit a quote report for ONE home — no PHI, no account.
 */

const DEFAULT_TTL_DAYS = 60;

export interface QuoteTokenPayload {
  homeId: string;
  inquiryId?: string;
  iat: number;
  exp: number;
  type: 'quote';
}

function toB64u(s: string): string { return Buffer.from(s).toString('base64url'); }
function fromB64u(s: string): string { return Buffer.from(s, 'base64url').toString('utf-8'); }
function hmac(data: string, secret: string): string { return crypto.createHmac('sha256', secret).update(data).digest('base64url'); }

export function signQuoteToken(homeId: string, secret: string, opts?: { inquiryId?: string; ttlDays?: number }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: QuoteTokenPayload = {
    homeId,
    ...(opts?.inquiryId ? { inquiryId: opts.inquiryId } : {}),
    iat: now,
    exp: now + (opts?.ttlDays ?? DEFAULT_TTL_DAYS) * 24 * 3600,
    type: 'quote',
  };
  const data = toB64u(JSON.stringify(payload));
  return `${data}.${hmac(data, secret)}`;
}

export function verifyQuoteToken(token: string, secret: string): QuoteTokenPayload | null {
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
    const payload = JSON.parse(fromB64u(data as string)) as QuoteTokenPayload;
    if (payload.type !== 'quote' || !payload.homeId) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
