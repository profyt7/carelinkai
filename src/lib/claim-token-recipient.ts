/**
 * Client-safe (no Node crypto). The recipient email a claim token names, read WITHOUT verifying
 * the signature — for prefilling the register form only. The register API verifies the token
 * and refuses a signup whose email doesn't match it. Null if unreadable.
 */
export function claimTokenRecipientUnverified(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
    const email = JSON.parse(json)?.operatorEmail;
    return typeof email === 'string' && email.includes('@') ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}
