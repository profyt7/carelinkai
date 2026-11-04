// OL-260: the Reminders Processor cron must never fall back to localhost in production.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveBaseUrl } = require('../scripts/run-cron.js');

describe('run-cron resolveBaseUrl', () => {
  it('prefers CRON_BASE_URL, then NEXT_PUBLIC_APP_URL, then NEXTAUTH_URL', () => {
    expect(resolveBaseUrl({ CRON_BASE_URL: 'https://a.test/', NEXT_PUBLIC_APP_URL: 'https://b.test' })).toBe('https://a.test');
    expect(resolveBaseUrl({ NEXT_PUBLIC_APP_URL: 'https://b.test/', NEXTAUTH_URL: 'https://c.test' })).toBe('https://b.test');
    expect(resolveBaseUrl({ NEXTAUTH_URL: 'https://c.test' })).toBe('https://c.test');
  });
  it('falls back to the production host when NODE_ENV=production and nothing is set', () => {
    expect(resolveBaseUrl({ NODE_ENV: 'production' })).toBe('https://getcarelinkai.com');
  });
  it('ignores values that are not http(s) URLs', () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_APP_URL: 'getcarelinkai.com', NODE_ENV: 'production' })).toBe('https://getcarelinkai.com');
  });
  it('uses localhost outside production', () => {
    expect(resolveBaseUrl({})).toBe('http://localhost:5000');
  });
});
