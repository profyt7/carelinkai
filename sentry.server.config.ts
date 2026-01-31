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

    // Enable Logs feature
    enableLogs: true,

    // Enable Metrics (automatically enabled in v10.25.0+, but explicit for clarity)
    enableMetrics: true,

    // Performance Monitoring - capture 10% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling disabled - nodeProfilingIntegration was causing deployment errors
    // profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode in development
    debug: process.env.NODE_ENV !== 'production',

    // Server-specific settings
    spotlight: process.env.NODE_ENV === 'development',

    // Enable sending default PII
    sendDefaultPii: true,

    // Integrations
    // Note: nodeProfilingIntegration() removed - was causing deployment errors
    // integrations: [],
  });

  // Verify initialization
  const client = Sentry.getClient();
  console.log('[Sentry Server] ✅ Initialized with features:');
  console.log('[Sentry Server]   - Performance Monitoring: enabled');
  console.log('[Sentry Server]   - Profiling: disabled (integration removed)');
  console.log('[Sentry Server]   - Metrics: enabled');
  console.log('[Sentry Server]   - Logs: enabled');
  console.log('[Sentry Server]   - Client available:', !!client);
} else {
  console.warn('[Sentry Server] ⚠️ No DSN provided, Sentry disabled');
}
