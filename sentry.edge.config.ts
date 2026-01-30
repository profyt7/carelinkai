// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log('[Sentry Edge] Initializing...');
console.log('[Sentry Edge] DSN available:', !!SENTRY_DSN);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode
    debug: process.env.NODE_ENV !== 'production',

    // Enable sending default PII
    sendDefaultPii: true,

    // Experimental features
    _experiments: {
      // Enable metrics
      metricsAggregator: true,
    },
  });

  console.log('[Sentry Edge] ✅ Initialized with features:');
  console.log('[Sentry Edge]   - Performance Monitoring: enabled');
  console.log('[Sentry Edge]   - Metrics: enabled');
} else {
  console.warn('[Sentry Edge] ⚠️ No DSN provided, Sentry disabled');
}
