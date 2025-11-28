import { initTracing } from '@/lib/tracing';
import * as Sentry from '@sentry/nextjs';

export function register() {
  // Initialize OpenTelemetry if configured
  try { initTracing(); } catch { }
  const env = process.env['SENTRY_ENVIRONMENT'] || process.env.NODE_ENV;
  const version = process.env['APP_VERSION'] || process.env['npm_package_version'];
  const sha = process.env['RENDER_GIT_COMMIT']
    || process.env['VERCEL_GIT_COMMIT_SHA']
    || process.env['GITHUB_SHA']
    || process.env['GIT_COMMIT'];
  const release = sha
    ? `${version || '0.0.0'}@${String(sha).slice(0, 7)}`
    : (version ? `v${version}` : undefined);

  Sentry.init({
    dsn: process.env['SENTRY_DSN'] || '',
    tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] || 0.1),
    environment: env,
    release,
    beforeSend(event) {
      if (event.request) {
        delete (event.request as any).cookies;
        delete (event.request as any).headers;
        delete (event.request as any).data;
      }
      return event;
    },
  });
}