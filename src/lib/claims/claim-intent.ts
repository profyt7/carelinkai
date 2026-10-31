import crypto from 'crypto';

/**
 * Self-serve claim intent (fix/self-serve-claim): "Claim this listing" while signed out carries the home id
 * through registration as a short-lived signed token (HMAC-SHA256 with NEXTAUTH_SECRET, same shape as
 * src/lib/concierge/shortlist-token.ts). The register API redeems it once the operator account exists and
 * files a PENDING_REVIEW claim. It grants nothing on its own: an admin still approves every claim.
 * Separate from the outreach claim links (src/lib/claim-token.ts), which are unchanged.
 */

const TTL_SECONDS = 2 * 3600;

export interface ClaimIntentPayload {
  homeId: string;
  iat: number;
  exp: number;
  type: 'home_claim_intent';
}

function toB64u(s: string): string { return Buffer.from(s).toString('base64url'); }
function fromB64u(s: string): string { return Buffer.from(s, 'base64url').toString('utf-8'); }
function hmac(data: string, secret: string): string { return crypto.createHmac('sha256', secret).update(data).digest('base64url'); }

export function signClaimIntent(homeId: string, secret: string, now: number = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: ClaimIntentPayload = { homeId, iat, exp: iat + TTL_SECONDS, type: 'home_claim_intent' };
  const data = toB64u(JSON.stringify(payload));
  return `${data}.${hmac(data, secret)}`;
}

export function verifyClaimIntent(token: string, secret: string, now: number = Date.now()): ClaimIntentPayload | null {
  if (!secret || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts as [string, string];
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(hmac(data, secret), 'base64url'))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64u(data)) as ClaimIntentPayload;
    if (payload.type !== 'home_claim_intent' || typeof payload.homeId !== 'string' || !payload.homeId) return null;
    if (Math.floor(now / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Where a signed-out "Claim this listing" sends someone to sign up with the intent attached. */
export function registerUrlWithIntent(token: string): string {
  return `/auth/register?role=OPERATOR&claimIntent=${encodeURIComponent(token)}`;
}
