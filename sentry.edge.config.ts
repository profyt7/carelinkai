// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { scrubPhi } from './src/lib/phi-scrubber';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log('[Sentry Edge] Initializing...');
console.log('[Sentry Edge] DSN available:', !!SENTRY_DSN);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Enable Logs feature
    enableLogs: true,

    // Enable Metrics (automatically enabled in v10.25.0+, but explicit for clarity)
    enableMetrics: true,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode
    debug: process.env.NODE_ENV !== 'production',

    // HIPAA: never send PII/PHI to Sentry by default
    sendDefaultPii: false,

    beforeSend(event) {
      if (event.request?.data) {
        event.request.data = scrubPhi(event.request.data);
      }
      if (event.extra) {
        event.extra = scrubPhi(event.extra) as Record<string, unknown>;
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
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
