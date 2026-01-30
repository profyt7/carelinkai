// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Debug logging
console.log('[Sentry Server] Initializing...');
console.log('[Sentry Server] DSN available:', !!SENTRY_DSN);
console.log('[Sentry Server] Environment:', process.env.NODE_ENV);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring - capture 10% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling - capture 10% of transactions for profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode in development
    debug: process.env.NODE_ENV !== 'production',

    // Server-specific settings
    spotlight: process.env.NODE_ENV === 'development',

    // Enable sending default PII
    sendDefaultPii: true,

    // Integrations
    integrations: [
      // Node profiling integration for server-side profiling
      Sentry.nodeProfilingIntegration(),
    ],

    // Experimental features
    _experiments: {
      // Enable metrics
      metricsAggregator: true,
    },
  });

  // Verify initialization
  const client = Sentry.getClient();
  console.log('[Sentry Server] ✅ Initialized with features:');
  console.log('[Sentry Server]   - Performance Monitoring: enabled');
  console.log('[Sentry Server]   - Profiling: enabled');
  console.log('[Sentry Server]   - Metrics: enabled');
  console.log('[Sentry Server]   - Client available:', !!client);
} else {
  console.warn('[Sentry Server] ⚠️ No DSN provided, Sentry disabled');
}
