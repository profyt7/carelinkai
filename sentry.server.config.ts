// This file configures the initialization of Sentry on the server.
// The config here is used when handling requests in the Next.js server runtime.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'] || '',
  tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] || 0.1),
  beforeSend(event) {
    // Scrub PII from server events
    if (event.request) {
      delete (event.request as any).cookies;
      delete (event.request as any).headers;
      delete (event.request as any).data;
    }
    return event;
  },
});