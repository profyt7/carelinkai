import * as Sentry from '@sentry/nextjs';

export function register() {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'] || '',
    tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] || 0.1),
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