import crypto from 'crypto';

/**
 * Signed, unforgeable email-unsubscribe tokens for cold-outreach (claim-nudge) email.
 * Mirrors src/lib/claim-token.ts (HMAC-SHA256 over a base64url payload, signed with
 * NEXTAUTH_SECRET). Deliberately has NO expiry — an unsubscribe link must keep working
 * indefinitely (CAN-SPAM / RFC 8058), and a token only ever ADDS a suppression, so a
 * long-lived link carries no risk.
 */

export interface UnsubscribeTokenPayload {
  email: string; // always lowercased
  iat: number;
  type: 'unsubscribe';
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

/** Sign an unsubscribe token for an email. Returns `<data>.<signature>`. */
export function signUnsubscribeToken(email: string, secret: string): string {
  const payload: UnsubscribeTokenPayload = {
    email: email.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    type: 'unsubscribe',
  };
  const data = toBase64url(JSON.stringify(payload));
  return `${data}.${hmac(data, secret)}`;
}

/** Verify an unsubscribe token. Returns the payload, or null if invalid. */
export function verifyUnsubscribeToken(token: string, secret: string): UnsubscribeTokenPayload | null {
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
    const payload = JSON.parse(fromBase64url(data)) as UnsubscribeTokenPayload;
    if (payload.type !== 'unsubscribe' || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
