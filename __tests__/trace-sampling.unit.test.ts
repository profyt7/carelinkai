/**
 * Sentry tracesSampler (src/lib/sentry/trace-sampling.ts): health-check,
 * uptime-poller and bot traffic must never produce a transaction; everything
 * else keeps the base rate / inherited decision.
 */

import {
  isBotUserAgent,
  isHealthPath,
  isMiddlewareTransaction,
  isNonRoutePath,
  isScannerPath,
  makeBeforeSendTransaction,
  makeTracesSampler,
  pathOf,
  shouldDropTrace,
  shouldDropTransactionEvent,
  statusCodeOf,
  userAgentOf,
} from '@/lib/sentry/trace-sampling';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const IOS_FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/153.0 Mobile/15E148 Safari/605.1.15';

describe('health paths', () => {
  it('drops /api/ping and /api/health regardless of caller', () => {
    for (const p of ['/api/ping', '/api/health', '/api/health/']) {
      expect(isHealthPath(p)).toBe(true);
      expect(shouldDropTrace({ name: `GET ${p}`, normalizedRequest: { url: `https://getcarelinkai.com${p}`, headers: { 'user-agent': CHROME } } })).toBe(true);
    }
    expect(isHealthPath('/api/healthz-not')).toBe(false);
    expect(isHealthPath('/')).toBe(false);
  });

  it('extracts the path from normalizedRequest, attributes or the name', () => {
    expect(pathOf({ normalizedRequest: { url: 'https://x.test/api/health?x=1' } })).toBe('/api/health');
    expect(pathOf({ attributes: { 'http.target': '/api/ping?y' } })).toBe('/api/ping');
    expect(pathOf({ attributes: { 'url.path': '/cleveland' } })).toBe('/cleveland');
    expect(pathOf({ name: 'GET /api/ping' })).toBe('/api/ping');
    expect(pathOf({ name: 'middleware GET' })).toBe('');
  });
});

describe('bot / poller user agents', () => {
  it.each([
    'Render/1.0',
    'Go-http-client/1.1',
    'UptimeRobot/2.0; http://www.uptimerobot.com/',
    'Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)',
    'Better Uptime Bot Mozilla/5.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
    'curl/8.4.0',
    'python-requests/2.31',
    'kube-probe/1.29',
    'ELB-HealthChecker/2.0',
  ])('drops %s', (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
    expect(shouldDropTrace({ name: 'GET /', normalizedRequest: { url: 'https://getcarelinkai.com/', method: 'GET', headers: { 'user-agent': ua } } })).toBe(true);
  });

  it.each([CHROME, IOS_FIREFOX, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'])(
    'keeps real browsers: %s',
    (ua) => {
      expect(isBotUserAgent(ua)).toBe(false);
      expect(shouldDropTrace({ name: 'GET /', normalizedRequest: { url: 'https://getcarelinkai.com/', method: 'GET', headers: { 'user-agent': ua } } })).toBe(false);
    }
  );

  it('reads the UA from attributes when normalizedRequest is absent (edge)', () => {
    expect(userAgentOf({ attributes: { 'http.user_agent': 'UptimeRobot/2.0' } })).toBe('UptimeRobot/2.0');
    expect(userAgentOf({ attributes: { 'user_agent.original': 'curl/8' } })).toBe('curl/8');
    expect(shouldDropTrace({ name: 'middleware GET', attributes: { 'http.user_agent': 'Render/1.0', 'http.target': '/' } })).toBe(true);
  });

  it('drops HEAD requests (pollers) even from an unknown UA', () => {
    expect(shouldDropTrace({ name: 'HEAD /', normalizedRequest: { url: 'https://getcarelinkai.com/', method: 'HEAD', headers: {} } })).toBe(true);
    expect(shouldDropTrace({ name: 'GET /', attributes: { 'http.method': 'HEAD' } })).toBe(true);
  });

  it('keeps a plain GET / from a browser with no UA header (unknown ≠ bot)', () => {
    expect(shouldDropTrace({ name: 'GET /', normalizedRequest: { url: 'https://getcarelinkai.com/', method: 'GET', headers: {} } })).toBe(false);
  });
});

describe('middleware span (sprint W3 item 1 — 39.8K "middleware GET"/day)', () => {
  it('drops the Edge middleware root span by name, with the exact sampling context the Edge SDK passes', () => {
    // wrapMiddlewareWithSentry: name "middleware <METHOD>", attributes carry only
    // sentry.source + sentry.origin — no URL, no User-Agent.
    const edgeCtx = {
      name: 'middleware GET',
      attributes: { 'sentry.source': 'url', 'sentry.origin': 'auto.function.nextjs.wrap_middleware' },
    };
    expect(isMiddlewareTransaction(edgeCtx)).toBe(true);
    expect(shouldDropTrace(edgeCtx)).toBe(true);
    expect(makeTracesSampler(0.1)(edgeCtx)).toBe(0);
  });

  it.each(['middleware GET', 'middleware POST', 'middleware HEAD', 'middleware'])('drops %s', (name) => {
    expect(shouldDropTrace({ name })).toBe(true);
  });

  it('drops by op / origin even when the name was rewritten', () => {
    expect(isMiddlewareTransaction({ name: 'GET /', attributes: { 'sentry.op': 'http.server.middleware' } })).toBe(true);
    expect(isMiddlewareTransaction({ name: 'GET /', op: 'http.server.middleware' })).toBe(true);
    expect(isMiddlewareTransaction({ name: 'GET /', attributes: { 'sentry.origin': 'auto.function.nextjs.wrap_middleware' } })).toBe(true);
  });

  it('does not mistake a page route for middleware', () => {
    expect(isMiddlewareTransaction({ name: 'GET /cleveland', attributes: { 'sentry.origin': 'auto.http.otel.http' } })).toBe(false);
    expect(isMiddlewareTransaction({ name: 'GET /middleware-docs' })).toBe(false);
  });
});

describe('scanner / non-route paths', () => {
  it.each([
    // Real transaction names from Sentry, 2026-10-13 (all 404 via middleware, browser UAs)
    '/wp-admin/setup-config.php',
    '/wp-includes/sodium_compat/src/index.php',
    '/wp_blog_footer.php',
    '/.env.dev',
    '/.env.production',
    '/.env.sample',
    '/.env.backup',
    '/.envrc',
    '/.npmrc',
    '/.docker/config.json',
    '/.gitlab-ci.yml',
    '/source/.env',
    '/application/.env',
    '/vendor/composer/installed.json',
    '/WEB-INF/web.xml',
    '/config.json',
    '/runtime-config.js',
    '/doc.php',
    '/about.php7',
    '/css/classwithtostring.php',
    '/*',
    '/zzz-nope',
    '/_not-found',
  ])('drops %s', (p) => {
    expect(isNonRoutePath(p)).toBe(true);
    expect(
      shouldDropTrace({ name: `GET ${p}`, normalizedRequest: { url: `https://getcarelinkai.com${p}`, method: 'GET', headers: { 'user-agent': CHROME } } })
    ).toBe(true);
  });

  it('drops scanner fingerprints under a KNOWN segment too', () => {
    for (const p of ['/api/.env', '/admin/wp-login.php', '/homes/x/xmlrpc.php', '/api/vendor/composer/installed.json']) {
      expect(isScannerPath(p)).toBe(true);
      expect(isNonRoutePath(p)).toBe(true);
    }
  });

  it.each([
    '/',
    '/cleveland',
    '/cleveland/assisted-living',
    '/homes/clx123',
    '/search',
    '/learn/howto/choosing-a-home',
    '/api/search',
    '/api/homes/search',
    '/auth/login',
    '/operator/dashboard',
    '/claim',
    '/monitoring',
  ])('keeps app route %s', (p) => {
    expect(isScannerPath(p)).toBe(false);
    expect(isNonRoutePath(p)).toBe(false);
    expect(
      shouldDropTrace({ name: `GET ${p}`, normalizedRequest: { url: `https://getcarelinkai.com${p}?a=1`, method: 'GET', headers: { 'user-agent': CHROME } } })
    ).toBe(false);
  });

  it('an unknown (empty) path is not treated as non-route', () => {
    expect(isNonRoutePath('')).toBe(false);
    expect(shouldDropTrace({ name: 'prisma:client:detect_platform' })).toBe(false);
  });
});

describe('beforeSendTransaction (404 backstop)', () => {
  const hook = makeBeforeSendTransaction();
  const ok = (overrides: Record<string, unknown> = {}) => ({
    type: 'transaction',
    transaction: 'GET /cleveland/assisted-living',
    request: { url: 'https://getcarelinkai.com/cleveland/assisted-living', method: 'GET', headers: { 'user-agent': CHROME } },
    contexts: { trace: { op: 'http.server', data: { 'http.response.status_code': 200 } } },
    ...overrides,
  });

  it('reads the status from whichever field the SDK filled', () => {
    expect(statusCodeOf({ contexts: { trace: { data: { 'http.response.status_code': 404 } } } })).toBe(404);
    expect(statusCodeOf({ contexts: { trace: { data: { 'http.status_code': '404' } } } })).toBe(404);
    expect(statusCodeOf({ contexts: { response: { status_code: 404 } } })).toBe(404);
    expect(statusCodeOf({ contexts: { trace: { data: {} } } })).toBeUndefined();
  });

  it('drops any 404 transaction, even on a real route', () => {
    const e = ok({ transaction: 'GET /homes/[id]', contexts: { trace: { op: 'http.server', data: { 'http.response.status_code': 404 } } } });
    expect(shouldDropTransactionEvent(e)).toBe(true);
    expect(hook(e)).toBeNull();
    expect(hook(ok({ contexts: { response: { status_code: 404 }, trace: { op: 'http.server' } } }))).toBeNull();
  });

  it('drops the middleware transaction and scanner paths at send time too', () => {
    expect(hook(ok({ transaction: 'middleware GET', request: undefined, contexts: { trace: { op: 'http.server.middleware' } } }))).toBeNull();
    expect(hook(ok({ transaction: 'GET /.env.production', request: { url: 'https://getcarelinkai.com/.env.production', method: 'GET' }, contexts: { trace: { op: 'http.server', data: { 'http.response.status_code': 200 } } } }))).toBeNull();
    expect(hook(ok({ transaction: 'GET /api/health', request: { url: 'https://getcarelinkai.com/api/health', method: 'GET' } }))).toBeNull();
  });

  it('passes a 200 page transaction through untouched', () => {
    const e = ok();
    expect(shouldDropTransactionEvent(e)).toBe(false);
    expect(hook(e)).toBe(e);
    // 5xx stay too — those are the ones worth looking at
    expect(hook(ok({ contexts: { trace: { op: 'http.server', data: { 'http.response.status_code': 500 } } } }))).not.toBeNull();
  });
});

describe('makeTracesSampler', () => {
  const sampler = makeTracesSampler(0.1);

  it('returns 0 for dropped traffic', () => {
    expect(sampler({ name: 'GET /api/ping' })).toBe(0);
    expect(sampler({ name: 'GET /api/health' })).toBe(0);
    expect(sampler({ name: 'middleware GET' })).toBe(0);
    expect(sampler({ name: 'GET /wp-admin/setup-config.php', normalizedRequest: { headers: { 'user-agent': CHROME } } })).toBe(0);
    expect(sampler({ name: 'GET /_not-found' })).toBe(0);
    expect(sampler({ name: 'GET /', normalizedRequest: { headers: { 'user-agent': 'Go-http-client/1.1' } } })).toBe(0);
  });

  it('uses the base rate for ordinary requests', () => {
    expect(sampler({ name: 'GET /cleveland', normalizedRequest: { headers: { 'user-agent': CHROME } } })).toBe(0.1);
    expect(sampler({ name: 'GET /', normalizedRequest: { headers: { 'user-agent': CHROME } } })).toBe(0.1);
    expect(sampler({ name: 'GET /homes/clx123', normalizedRequest: { headers: { 'user-agent': CHROME } } })).toBe(0.1);
    expect(sampler({ name: 'POST /api/search', normalizedRequest: { headers: { 'user-agent': CHROME } } })).toBe(0.1);
  });

  it('defers to inheritOrSampleWith when the SDK provides it', () => {
    const inherit = jest.fn(() => 1);
    expect(sampler({ name: 'GET /search', normalizedRequest: { headers: { 'user-agent': CHROME } }, inheritOrSampleWith: inherit })).toBe(1);
    expect(inherit).toHaveBeenCalledWith(0.1);
  });

  it('inherit is NOT consulted for dropped traffic', () => {
    const inherit = jest.fn(() => 1);
    expect(sampler({ name: 'GET /api/health', inheritOrSampleWith: inherit })).toBe(0);
    expect(inherit).not.toHaveBeenCalled();
  });

  it('honours parentSampled when inheritOrSampleWith is missing', () => {
    expect(sampler({ name: 'GET /search', parentSampled: true })).toBe(1);
    expect(sampler({ name: 'GET /search', parentSampled: false })).toBe(0);
  });
});
