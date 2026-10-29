// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { scrubPhi } from './src/lib/phi-scrubber';
import { scrubBreadcrumb, scrubEvent } from './src/lib/sentry/scrub-event';
import { makeBeforeSendTransaction, makeTracesSampler } from './src/lib/sentry/trace-sampling';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log('[Sentry Edge] Initializing...');
console.log('[Sentry Edge] DSN available:', !!SENTRY_DSN);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Report ONLY from production. CI/e2e runs (NODE_ENV=development on
    // localhost) were the source of dev-tagged noise (CARELINK-AI-16/-17). The
    // beforeSend guard below is the backstop to this flag.
    enabled: process.env.NODE_ENV === 'production',

    // Enable Logs feature
    enableLogs: true,

    // Enable Metrics (automatically enabled in v10.25.0+, but explicit for clarity)
    enableMetrics: true,

    // Performance Monitoring - 10% in production for edge routes, but the
    // middleware root span ("middleware GET") is sampled at 0: on this runtime
    // the sampler sees only the span name (no URL / User-Agent), every page
    // request already has a Node transaction, and it was 39.8K spans/day of
    // Render health-check polls — see src/lib/sentry/trace-sampling.ts.
    tracesSampler: makeTracesSampler(process.env.NODE_ENV === 'production' ? 0.1 : 1.0),

    // Backstop once the response is known: drop every 404 transaction.
    // OL-226/230: then strip query strings from span/request URLs.
    beforeSendTransaction: (event) => {
      const kept = makeBeforeSendTransaction()(event);
      return kept ? scrubEvent(kept) : null;
    },

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode
    debug: process.env.NODE_ENV !== 'production',

    // HIPAA: never send PII/PHI to Sentry by default
    sendDefaultPii: false,

    beforeSend(event) {
      // Backstop to `enabled` above: drop every non-production event so CI/e2e
      // noise never reaches Sentry, even if a DSN leaks into a dev environment.
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      // OL-226/230: strip query strings, trim error text that echoes input (Prisma/Zod).
      scrubEvent(event);
      if (event.request?.data) {
        event.request.data = scrubPhi(event.request.data);
      }
      if (event.extra) {
        event.extra = scrubPhi(event.extra) as Record<string, unknown>;
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // OL-230: console breadcrumbs can hold any logged string — drop them; strip URL queries.
      if (!scrubBreadcrumb(breadcrumb)) return null;
      if (breadcrumb.data) {
        breadcrumb.data = scrubPhi(breadcrumb.data) as Record<string, unknown>;
      }
      return breadcrumb;
    },
  });

  console.log('[Sentry Edge] ✅ Initialized with features:');
  console.log('[Sentry Edge]   - Performance Monitoring: enabled');
  console.log('[Sentry Edge]   - Metrics: enabled');
  console.log('[Sentry Edge]   - Logs: enabled');
} else {
  console.warn('[Sentry Edge] ⚠️ No DSN provided, Sentry disabled');
}
