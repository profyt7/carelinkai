/**
 * Shared `tracesSampler` + `beforeSendTransaction` for the server + edge
 * Sentry configs.
 *
 * Goal: stop paying Sentry transaction quota (and the per-request tracing
 * overhead) for traffic that is not a human using the product:
 *
 *   - health-check / uptime pollers — Render's health check, UptimeRobot,
 *     Pingdom, BetterStack … (Sentry showed ~40K "GET /" transactions a day at
 *     a flat rate; render.yaml had `healthCheckPath: /`, so every poll was a
 *     full homepage render AND a traced transaction);
 *   - crawlers / scanners / SEO bots;
 *   - the cheap endpoints built FOR pollers: /api/ping and /api/health;
 *   - the Edge middleware root span ("middleware GET", sprint W3 item 1). The
 *     Edge SDK's sampling context for that span is ONLY its name plus
 *     `sentry.source` / `sentry.origin` — no URL, no User-Agent — so none of
 *     the request-aware rules below can see what it is. It is also redundant:
 *     every real page request already produces a Node "GET /route"
 *     transaction, so the middleware span is dropped outright (39.8K/day → 0);
 *   - requests for paths that are not pages at all — vulnerability scanners
 *     hitting /wp-admin/*, /.env.*, /*.php … The middleware answers 404, but
 *     the Node transaction is still named after the raw path and (because the
 *     scanners send browser User-Agents) survived the bot filter;
 *   - any transaction that ends as a 404 (`beforeSendTransaction` backstop,
 *     e.g. /homes/<unknown-id> from `notFound()`).
 *
 * Everything else (page routes, API routes) keeps the configured base rate.
 *
 * Pure + dependency-free (apart from the Edge-safe route table) so it can be
 * unit-tested and bundled into the Edge runtime. Runtime-agnostic: it only
 * reads fields the Sentry SDK passes to `tracesSampler` (name, attributes,
 * normalizedRequest) and to `beforeSendTransaction` (the event).
 */

// Relative on purpose: sentry.edge.config.ts / sentry.server.config.ts import
// this module by relative path from the repo root, outside the `@/` alias.
import { isKnownAppPath } from '../routing/public-routes';

export type SamplingInput = {
  /** Transaction name, e.g. "GET /", "middleware GET", "GET /api/health". */
  name?: string;
  /** OpenTelemetry-style span attributes set at span start. */
  attributes?: Record<string, unknown>;
  /** Normalized incoming request (Node runtime only). */
  normalizedRequest?: {
    url?: string;
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
  /** Sampling decision inherited from an incoming trace, if any. */
  parentSampled?: boolean;
};

/** Paths that exist for pollers — never worth a trace. */
export const HEALTH_PATHS: readonly string[] = ['/api/ping', '/api/health'];

/** Span op of the Next.js middleware wrapper (`wrapMiddlewareWithSentry`). */
export const MIDDLEWARE_OP = 'http.server.middleware';

/** `sentry.origin` the Next.js SDK stamps on the middleware root span. */
export const MIDDLEWARE_ORIGIN = 'auto.function.nextjs.wrap_middleware';

/**
 * Paths the middleware rewrites unknown routes to, and Next's own 404 page.
 * A trace of "we served the 404 page" carries no signal.
 */
export const NOT_FOUND_PATHS: readonly string[] = ['/_not-found', '/404'];

/**
 * Scanner / probe fingerprints that can appear UNDER a known segment too
 * (e.g. /api/.env, /admin/wp-login.php), where the unknown-segment rule does
 * not fire. Matched case-insensitively against the full path. Conservative on
 * purpose: nothing the app serves ends in these.
 */
export const SCANNER_PATH_PATTERNS: readonly RegExp[] = [
  /\.(php\d?|phtml|asp|aspx|jsp|cgi|pl|sql|bak|old|orig|swp|tar|gz|zip|rar|7z)$/i,
  /(^|\/)\.(env|git|svn|hg|docker|npmrc|envrc|htaccess|htpasswd|aws|ssh|DS_Store)(\b|[./-]|$)/i,
  /(^|\/)(wp-admin|wp-includes|wp-content|wp-login|wp-json|xmlrpc|phpmyadmin|pma|cgi-bin|vendor\/composer|web-inf)(\/|$)/i,
  /(^|\/)wp_[a-z0-9_-]*\.php$/i,
];

/**
 * User-agent fragments for uptime monitors, platform health checks and bots.
 * Matched case-insensitively against the raw User-Agent header. Keep this list
 * conservative: a false positive only drops a trace, never an error event.
 */
export const BOT_UA_FRAGMENTS: readonly string[] = [
  // Platform / uptime pollers
  'render',            // Render health check ("Render/1.0", "Go-http-client" is handled below)
  'go-http-client',    // Render's checker + many Go-based monitors
  'uptimerobot',
  'uptime-kuma',
  'pingdom',
  'betteruptime',
  'betterstack',
  'statuscake',
  'site24x7',
  'freshping',
  'checkly',
  'hetrixtools',
  'datadog',
  'newrelicpinger',
  'kube-probe',
  'elb-healthchecker',
  'healthcheck',
  'health-check',
  // Crawlers / scanners
  'bot',               // Googlebot, Bingbot, AhrefsBot, SemrushBot, DotBot, PetalBot …
  'crawler',
  'spider',
  'slurp',
  'facebookexternalhit',
  'headlesschrome',
  'lighthouse',
  'python-requests',
  'python-urllib',
  'curl/',
  'wget/',
  'libwww-perl',
  'scrapy',
  'masscan',
  'zgrab',
  'nmap',
  'censys',
];

function firstHeader(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

/** Best-effort User-Agent extraction across the fields Sentry exposes. */
export function userAgentOf(input: SamplingInput): string {
  const h = input.normalizedRequest?.headers;
  if (h) {
    const ua = firstHeader(h['user-agent'] ?? h['User-Agent']);
    if (ua) return ua;
  }
  const a = input.attributes ?? {};
  const fromAttr =
    a['http.user_agent'] ?? a['user_agent.original'] ?? a['http.request.header.user_agent'];
  if (typeof fromAttr === 'string') return fromAttr;
  if (Array.isArray(fromAttr) && typeof fromAttr[0] === 'string') return fromAttr[0];
  return '';
}

/** Best-effort request path extraction (no query string). */
export function pathOf(input: SamplingInput): string {
  const tryUrl = (u: unknown): string | null => {
    if (typeof u !== 'string' || !u) return null;
    try {
      return new URL(u, 'http://local').pathname;
    } catch {
      return null;
    }
  };
  const a = input.attributes ?? {};
  return (
    tryUrl(input.normalizedRequest?.url) ??
    tryUrl(a['http.target']) ??
    tryUrl(a['url.path']) ??
    tryUrl(a['http.url']) ??
    tryUrl(a['url.full']) ??
    // "GET /api/health" / "middleware GET" → take the path token if present
    (input.name ?? '').split(' ').find((t) => t.startsWith('/')) ??
    ''
  );
}

export function isHealthPath(path: string): boolean {
  return HEALTH_PATHS.some((p) => path === p || path.startsWith(p + '/'));
}

export function isBotUserAgent(ua: string): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_UA_FRAGMENTS.some((frag) => lower.includes(frag));
}

/**
 * True for the Edge middleware root span. The wrapper names it
 * "middleware <METHOD>" (Request available) or just "middleware"; the op
 * (`http.server.middleware`) is only on the span itself, not in the sampling
 * context, so the name + origin are what the sampler can key on.
 */
export function isMiddlewareTransaction(
  input: SamplingInput & { op?: string }
): boolean {
  const name = (input.name ?? '').trim();
  if (name === 'middleware' || name.startsWith('middleware ')) return true;
  const a = input.attributes ?? {};
  if (a['sentry.op'] === MIDDLEWARE_OP || input.op === MIDDLEWARE_OP) return true;
  if (a['sentry.origin'] === MIDDLEWARE_ORIGIN) return true;
  return false;
}

export function isNotFoundPath(path: string): boolean {
  return NOT_FOUND_PATHS.some((p) => path === p || path.startsWith(p + '/'));
}

/** Vulnerability-scanner / probe paths (see SCANNER_PATH_PATTERNS). */
export function isScannerPath(path: string): boolean {
  if (!path) return false;
  return SCANNER_PATH_PATTERNS.some((re) => re.test(path));
}

/**
 * True when the path cannot be a page or API route of this app: the first
 * segment is not a src/app route (the middleware 404s it), it is the 404 page
 * itself, or it carries a scanner fingerprint. "/" and an unknown (empty)
 * path are NOT dropped — the latter means the SDK gave us no URL at all.
 */
export function isNonRoutePath(path: string): boolean {
  if (!path || path === '/') return false;
  if (isNotFoundPath(path)) return true;
  if (isScannerPath(path)) return true;
  return !isKnownAppPath(path);
}

/**
 * True when the transaction should NOT be traced at all.
 */
export function shouldDropTrace(input: SamplingInput & { op?: string }): boolean {
  if (isMiddlewareTransaction(input)) return true;
  const method = (
    (input.normalizedRequest?.method as string | undefined) ??
    (input.attributes?.['http.method'] as string | undefined) ??
    (input.attributes?.['http.request.method'] as string | undefined) ??
    ''
  ).toUpperCase();
  // HEAD is what uptime pollers send; the app never serves a human a HEAD.
  if (method === 'HEAD') return true;
  const path = pathOf(input);
  if (isHealthPath(path)) return true;
  if (isNonRoutePath(path)) return true;
  if (isBotUserAgent(userAgentOf(input))) return true;
  return false;
}

/**
 * Minimal shape of the Sentry `TransactionEvent` fields this module reads.
 * Declared locally so the module stays free of `@sentry/*` imports (Edge
 * bundle size + unit tests without the SDK).
 */
export type TransactionEventLike = {
  type?: string;
  transaction?: string;
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
  contexts?: {
    trace?: { op?: string; data?: Record<string, unknown> };
    response?: { status_code?: number };
  };
};

/** HTTP status of a finished transaction, from whichever field the SDK filled. */
export function statusCodeOf(event: TransactionEventLike): number | undefined {
  const data = event.contexts?.trace?.data ?? {};
  const candidates = [
    event.contexts?.response?.status_code,
    data['http.response.status_code'],
    data['http.status_code'],
  ];
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : c;
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/**
 * `beforeSendTransaction` decision, evaluated when the transaction has
 * FINISHED (so the status code is known). Drops:
 *   - anything `shouldDropTrace` would have dropped (re-checked here because
 *     the final transaction name / URL can differ from the span-start one);
 *   - any 404 response.
 */
export function shouldDropTransactionEvent(event: TransactionEventLike): boolean {
  if (statusCodeOf(event) === 404) return true;
  return shouldDropTrace({
    name: event.transaction,
    op: event.contexts?.trace?.op,
    attributes: event.contexts?.trace?.data,
    normalizedRequest: event.request
      ? { url: event.request.url, method: event.request.method, headers: event.request.headers }
      : undefined,
  });
}

/** Build the `beforeSendTransaction` hook for a Sentry.init() call. */
export function makeBeforeSendTransaction() {
  return <E extends TransactionEventLike>(event: E): E | null =>
    shouldDropTransactionEvent(event) ? null : event;
}

/**
 * Build the `tracesSampler` for a Sentry.init() call.
 * @param baseRate sample rate for everything that is not dropped
 */
export function makeTracesSampler(baseRate: number) {
  return (ctx: SamplingInput & { inheritOrSampleWith?: (rate: number) => number }): number => {
    if (shouldDropTrace(ctx)) return 0;
    // Keep the parent's decision for distributed traces (browser → server).
    if (typeof ctx.inheritOrSampleWith === 'function') return ctx.inheritOrSampleWith(baseRate);
    if (ctx.parentSampled === true) return 1;
    if (ctx.parentSampled === false) return 0;
    return baseRate;
  };
}
