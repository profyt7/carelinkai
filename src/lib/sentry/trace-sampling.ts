/**
 * Shared `tracesSampler` for the server + edge Sentry configs.
 *
 * Goal: stop paying Sentry transaction quota (and the per-request tracing
 * overhead) for traffic that is not a human using the product:
 *
 *   - health-check / uptime pollers — Render's health check, UptimeRobot,
 *     Pingdom, BetterStack … (Sentry showed ~40K "GET /" transactions a day at
 *     a flat rate; render.yaml had `healthCheckPath: /`, so every poll was a
 *     full homepage render AND a traced transaction);
 *   - crawlers / scanners / SEO bots;
 *   - the cheap endpoints built FOR pollers: /api/ping and /api/health.
 *
 * Everything else keeps the configured base rate.
 *
 * Pure + dependency-free so it can be unit-tested and bundled into the Edge
 * runtime. Runtime-agnostic: it only reads fields the Sentry SDK passes to
 * `tracesSampler` (name, attributes, normalizedRequest).
 */

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
 * True when the transaction should NOT be traced at all.
 */
export function shouldDropTrace(input: SamplingInput): boolean {
  const method = (
    (input.normalizedRequest?.method as string | undefined) ??
    (input.attributes?.['http.method'] as string | undefined) ??
    (input.attributes?.['http.request.method'] as string | undefined) ??
    ''
  ).toUpperCase();
  // HEAD is what uptime pollers send; the app never serves a human a HEAD.
  if (method === 'HEAD') return true;
  if (isHealthPath(pathOf(input))) return true;
  if (isBotUserAgent(userAgentOf(input))) return true;
  return false;
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
