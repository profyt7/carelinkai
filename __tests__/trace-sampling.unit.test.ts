/**
 * Sentry tracesSampler (src/lib/sentry/trace-sampling.ts): health-check,
 * uptime-poller and bot traffic must never produce a transaction; everything
 * else keeps the base rate / inherited decision.
 */

import {
  isBotUserAgent,
  isHealthPath,
  makeTracesSampler,
  pathOf,
  shouldDropTrace,
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

describe('makeTracesSampler', () => {
  const sampler = makeTracesSampler(0.1);

  it('returns 0 for dropped traffic', () => {
    expect(sampler({ name: 'GET /api/ping' })).toBe(0);
    expect(sampler({ name: 'GET /', normalizedRequest: { headers: { 'user-agent': 'Go-http-client/1.1' } } })).toBe(0);
  });

  it('uses the base rate for ordinary requests', () => {
    expect(sampler({ name: 'GET /cleveland', normalizedRequest: { headers: { 'user-agent': CHROME } } })).toBe(0.1);
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
    expect(sampler({ name: 'GET /x', parentSampled: true })).toBe(1);
    expect(sampler({ name: 'GET /x', parentSampled: false })).toBe(0);
  });
});
