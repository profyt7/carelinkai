/**
 * Pre-send email validation — syntax + domain MX (fix/resend-bounce-suppression).
 *
 * Catches obviously-invalid and undeliverable-domain addresses BEFORE they enter
 * the send queue, so scraped/imported lists don't generate fresh hard bounces.
 * Deliberately uses only FREE checks (regex + a DNS MX lookup) — no per-address
 * paid verification API (NeverBounce/ZeroBounce bill per check; wiring one as a
 * recurring per-send step is a cost decision flagged for the founder, not done here).
 *
 * MX results are memoized per-domain for the life of the process (a scrub run hits
 * the same domains repeatedly), with a short timeout and fail-OPEN semantics: a DNS
 * hiccup must not wrongly quarantine a good address.
 */

import { promises as dns } from 'dns';
import { normalizeEmail } from '@/lib/email/suppression';

/** Practical email syntax check — stricter than a bare "has an @". Single @, a
 *  dotted domain with a 2+ char TLD, no spaces/consecutive dots. Not full RFC 5322
 *  (that accepts addresses no mail system routes); this rejects the junk scrapes
 *  actually produce. */
const EMAIL_RE = /^[^\s@"'()<>,;:\\]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function isValidEmailSyntax(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  if (!e || e.length > 254) return false;
  if (e.includes('..')) return false;
  const at = e.lastIndexOf('@');
  if (at <= 0) return false;
  if (e.slice(0, at).length > 64) return false; // local part cap
  return EMAIL_RE.test(e);
}

export function domainOf(email: string): string {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  return at >= 0 ? e.slice(at + 1) : '';
}

const mxCache = new Map<string, boolean>();

/** True if the domain publishes MX (or a fallback A/AAAA per RFC 5321 §5.1) records.
 *  Fails OPEN (returns true) on timeout/transient DNS errors; only a definitive
 *  NXDOMAIN / no-records answer returns false. */
export async function hasDeliverableDomain(domain: string, timeoutMs = 5000): Promise<boolean> {
  const d = (domain || '').trim().toLowerCase();
  if (!d) return false;
  if (mxCache.has(d)) return mxCache.get(d)!;

  const withTimeout = <T>(p: Promise<T>): Promise<T> => {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<T>((_, rej) => {
      timer = setTimeout(() => rej(new Error('dns-timeout')), timeoutMs);
      timer.unref?.(); // don't keep the process alive on our account
    });
    return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
  };

  let deliverable: boolean;
  try {
    const mx = await withTimeout(dns.resolveMx(d));
    deliverable = Array.isArray(mx) && mx.some((r) => r.exchange);
  } catch (err: any) {
    // NODATA on MX → check A/AAAA (implicit MX). NXDOMAIN → not deliverable.
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'NXDOMAIN')) {
      try {
        const a = await withTimeout(dns.lookup(d));
        deliverable = Boolean(a && a.address);
      } catch (err2: any) {
        deliverable = !(err2 && (err2.code === 'ENOTFOUND' || err2.code === 'ENODATA' || err2.code === 'NXDOMAIN'));
      }
    } else {
      deliverable = true; // transient/timeout → fail open
    }
  }
  mxCache.set(d, deliverable);
  return deliverable;
}

export type EmailValidity =
  | { ok: true }
  | { ok: false; reason: 'invalid_syntax' | 'no_mx' };

/** Full pre-send gate: syntax first (cheap), then domain deliverability (DNS). */
export async function validateEmailForSend(email: string, timeoutMs = 5000): Promise<EmailValidity> {
  if (!isValidEmailSyntax(email)) return { ok: false, reason: 'invalid_syntax' };
  const ok = await hasDeliverableDomain(domainOf(email), timeoutMs);
  return ok ? { ok: true } : { ok: false, reason: 'no_mx' };
}

/** Test hook: clear the per-process MX memo. */
export function _clearMxCache(): void {
  mxCache.clear();
}
