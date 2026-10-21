/**
 * OL-160 — one cron auth check + one failure classifier, so a failed run's
 * log names the cause instead of "status 401".
 *
 *   checkCronAuth(headers, env)  → fail-CLOSED bearer / x-cron-secret check.
 *                                  Never returns or logs the secret.
 *   classifyCronFailure(status)  → "auth 401 — CRON_SECRET mismatch" vs
 *                                  "5xx — app error" (what the workflows print).
 *
 * The 401 response body stays generic ({ error: 'Unauthorized' }); the server
 * log line carries the reason (secret unset vs header mismatch), and the
 * caller classifies by status.
 */

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401; reason: 'secret_unset' | 'missing_header' | 'mismatch'; log: string };

type HeaderReader = { get(name: string): string | null };

export const CRON_AUTH_LOG: Record<Exclude<CronAuthResult, { ok: true }>['reason'], string> = {
  secret_unset: 'auth 401 — CRON_SECRET is not set on the server (endpoint fails closed)',
  missing_header: 'auth 401 — no Authorization: Bearer / x-cron-secret header on the request',
  mismatch: 'auth 401 — CRON_SECRET mismatch (caller sent a different value)',
};

/** Accepts `Authorization: Bearer <secret>` or the legacy `x-cron-secret: <secret>` header. */
export function checkCronAuth(headers: HeaderReader, env: NodeJS.ProcessEnv = process.env): CronAuthResult {
  const secret = (env['CRON_SECRET'] ?? '').trim();
  if (!secret) return { ok: false, status: 401, reason: 'secret_unset', log: CRON_AUTH_LOG.secret_unset };
  const auth = headers.get('authorization') ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() ?? '';
  const legacy = (headers.get('x-cron-secret') ?? '').trim();
  const presented = bearer || legacy;
  if (!presented) return { ok: false, status: 401, reason: 'missing_header', log: CRON_AUTH_LOG.missing_header };
  if (!timingSafeEqualString(presented, secret)) return { ok: false, status: 401, reason: 'mismatch', log: CRON_AUTH_LOG.mismatch };
  return { ok: true };
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Log the reason server-side (never the secret) and build the generic 401. */
export function cronUnauthorized(route: string, result: Exclude<CronAuthResult, { ok: true }>): { body: { error: string }; status: 401 } {
  console.warn(`[cron] ${route}: ${result.log}`);
  return { body: { error: 'Unauthorized' }, status: 401 };
}

export type CronFailureKind = 'ok' | 'auth' | 'app_error' | 'client_error' | 'unreachable';

/**
 * What a caller (GitHub workflow, Render cron script) should print for an HTTP
 * status. Mirrors the bash in .github/workflows/dp-followups.yml.
 */
export function classifyCronFailure(status: number): { kind: CronFailureKind; message: string } {
  if (status >= 200 && status < 300) return { kind: 'ok', message: 'ok' };
  if (status === 401 || status === 403) return { kind: 'auth', message: 'auth 401 — CRON_SECRET mismatch (or not set on the server)' };
  if (status >= 500) return { kind: 'app_error', message: `${status} — app error (5xx); see the response body / Sentry` };
  if (status === 0) return { kind: 'unreachable', message: 'no HTTP response — host unreachable or DNS/TLS failure' };
  return { kind: 'client_error', message: `${status} — client error (4xx); check the URL and method` };
}
