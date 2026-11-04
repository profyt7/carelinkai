/**
 * P0-7 (security decision package, Nov 2026): verify Twilio's X-Twilio-Signature on every inbound webhook.
 * Before this, /api/webhooks/twilio/{sms,status,voice,voice/accept} accepted any POST: a forged "YES"/Digits=1 could
 * fill or confirm a shift, a forged status could mark attempts failed, and voice leaked home/shift details by id.
 *
 * Algorithm (Twilio docs, form-encoded POST): base64(HMAC-SHA1(authToken, fullUrl + Σ sorted(key + value))), where
 * fullUrl is the public URL Twilio called, including the query string. Compared in constant time.
 * Fail closed: no TWILIO_AUTH_TOKEN in production → 503; bad/missing signature → 403. Outside production, a missing
 * token lets requests through so local development and tests keep working.
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export function twilioSignature(authToken: string, fullUrl: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], fullUrl);
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

/** The public URLs Twilio may have called (our configured base URLs; IVR actions are built from NEXTAUTH_URL). */
function candidateUrls(req: Request): string[] {
  const u = new URL(req.url);
  const bases = [process.env['NEXT_PUBLIC_APP_URL'], process.env['NEXTAUTH_URL'], 'https://getcarelinkai.com']
    .filter((b): b is string => !!b)
    .map((b) => b.replace(/\/$/, ''));
  return [...new Set(bases)].map((b) => `${b}${u.pathname}${u.search}`);
}

export async function verifyTwilioRequest(
  req: Request,
): Promise<{ ok: true; params: Record<string, string> } | { ok: false; response: NextResponse }> {
  const raw = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  const token = process.env['TWILIO_AUTH_TOKEN'];
  if (!token) {
    if (process.env['NODE_ENV'] === 'production') {
      return { ok: false, response: NextResponse.json({ error: 'Not configured' }, { status: 503 }) };
    }
    return { ok: true, params };
  }
  const given = Buffer.from(req.headers.get('x-twilio-signature') || '');
  const valid = candidateUrls(req).some((url) => {
    const expected = Buffer.from(twilioSignature(token, url, params));
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
  if (!valid) return { ok: false, response: NextResponse.json({ error: 'Invalid signature' }, { status: 403 }) };
  return { ok: true, params };
}
