// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a user loads a page in their browser.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'] || process.env['SENTRY_DSN'] || '',
  tracesSampleRate: Number(process.env['NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'] || process.env['SENTRY_TRACES_SAMPLE_RATE'] || 0.1),
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,
  beforeSend(event) {
    // Scrub potential PII
    if (event.request) {
      delete (event.request as any).cookies;
      delete (event.request as any).headers;
      delete (event.request as any).data;
    }
    return event;
  },
});
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
