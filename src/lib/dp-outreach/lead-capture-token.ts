import crypto from 'crypto';

/**
 * Shared-secret gate for the scoped, no-auth lead-capture form (`/lead/new?k=…`).
 *
 * This is the ONLY surface Anita (a Fiverr contractor with no app account) ever
 * touches. There is no login — an unguessable token in the URL, checked against
 * LEAD_CAPTURE_TOKEN, is the authorization. Both the page render and the submit
 * API validate it, so the endpoint can't be hit without the secret.
 *
 * Constant-time comparison so the check can't be timing-probed. Fails closed:
 * if LEAD_CAPTURE_TOKEN is unset, NO token is ever valid (the form is inert until
 * Chris sets the secret).
 */
export function leadCaptureTokenValid(provided: string | null | undefined): boolean {
  const expected = (process.env['LEAD_CAPTURE_TOKEN'] || '').trim();
  const got = (provided || '').trim();
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
