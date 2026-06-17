import crypto from 'crypto';

/**
 * Default lifetime of an operator claim link.
 *
 * 45 days — long enough for founder outreach + follow-up before a link
 * expires. The 50-founder-per-metro scarcity cap is enforced separately at
 * claim time and is independent of this expiry window.
 *
 * Note: this is the default applied when a new link is generated. Already-
 * signed tokens carry their own `exp` and keep their original window until
 * they are regenerated.
 */
export const DEFAULT_CLAIM_TOKEN_TTL_HOURS = 45 * 24; // 45 days

export interface ClaimTokenPayload {
  operatorEmail: string;
  homeId?: string;
  clevelandFounder: boolean;
  iat: number;
  exp: number;
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

/** Sign a claim token payload. Returns a `<data>.<signature>` string. */
export function signClaimToken(payload: ClaimTokenPayload, secret: string): string {
  const data = toBase64url(JSON.stringify(payload));
  const sig = hmac(data, secret);
  return `${data}.${sig}`;
}

/** Verify and decode a claim token. Returns null if invalid or expired. */
export function verifyClaimToken(token: string, secret: string): ClaimTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const expectedSig = hmac(data, secret);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64url(data)) as ClaimTokenPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
