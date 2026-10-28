/**
 * OL-194 — secret redaction for logs and Sentry payloads.
 *
 * Covers credentials, not PHI (that is src/lib/phi-scrubber.ts): passwords,
 * tokens (verification, reset, claim, session, JWT), API keys, webhook
 * secrets, Authorization / Cookie headers, OTP / TOTP material and links that
 * carry a token (reset, verification, magic, claim).
 */

/** Object keys whose values are always replaced. Case-insensitive, matched on the key's ending (userPassword, x-api-key, verificationToken). */
const SECRET_KEY_RE =
  /(password|passwd|pwd|newpassword|currentpassword|passwordhash|token|accesstoken|refreshtoken|idtoken|sessiontoken|verificationtoken|resettoken|claimtoken|csrftoken|jwt|secret|clientsecret|webhooksecret|apikey|api_key|api-key|authorization|cookie|cookies|set-cookie|otp|totpsecret|backupcodes|reseturl|resetlink|verifyurl|verificationurl|verificationlink|verifylink|magiclink|claimurl|claimlink)$/i;

export const REDACTED = '[REDACTED]';

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key);
}

/** Token-shaped substrings inside free text (URLs, headers, messages). */
const SECRET_VALUE_PATTERNS: Array<[RegExp, string]> = [
  // ?token=… / &code=… / &key=… query params
  [/([?&](?:token|code|key|secret|sig|signature|access_token|refresh_token|claim)=)[^&\s"'#]+/gi, `$1${REDACTED}`],
  // Authorization: Bearer …
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, `$1 ${REDACTED}`],
  // Provider key prefixes (Stripe secret/restricted/webhook, Resend, Anthropic)
  [/\b(sk_live|sk_test|rk_live|rk_test|whsec|re)_[A-Za-z0-9_-]{8,}/g, `$1_${REDACTED}`],
  [/\bsk-ant-[A-Za-z0-9_-]{8,}/g, `sk-ant-${REDACTED}`],
];

export function redactString(value: string): string {
  let out = value;
  for (const [re, replacement] of SECRET_VALUE_PATTERNS) out = out.replace(re, replacement);
  return out;
}

/** Show only enough to correlate: first 4 chars + length. Never the whole value. */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return '(none)';
  return `${value.slice(0, 4)}…(${value.length} chars)`;
}

/**
 * Deep-redact a log/Sentry payload: secret keys → '[REDACTED]', token-shaped
 * substrings in strings scrubbed. Pure; never throws on cycles (depth-capped).
 */
export function redactSecrets<T>(payload: T, depth = 0): T {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === 'string') return redactString(payload) as unknown as T;
  if (depth > 8 || typeof payload !== 'object') return payload;
  if (payload instanceof Date) return payload;
  if (payload instanceof Error) {
    const e = new Error(redactString(payload.message));
    e.name = payload.name;
    e.stack = payload.stack ? redactString(payload.stack) : undefined;
    return e as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => redactSecrets(item, depth + 1)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    result[key] = isSecretKey(key) ? REDACTED : redactSecrets(value, depth + 1);
  }
  return result as T;
}
