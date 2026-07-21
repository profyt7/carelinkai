// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { scrubPhi } from './src/lib/phi-scrubber';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Debug logging
console.log('[Sentry Server] Initializing...');
console.log('[Sentry Server] DSN available:', !!SENTRY_DSN);
console.log('[Sentry Server] Environment:', process.env.NODE_ENV);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Report ONLY from production. CI/e2e runs execute on localhost with
    // NODE_ENV=development and were the source of ~637 dev-tagged handled errors
    // (CARELINK-AI-16/-17, Resend 401s on the placeholder key). The beforeSend
    // guard below is the backstop to this flag.
    enabled: process.env.NODE_ENV === 'production',

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

    // HIPAA: never send PII/PHI to Sentry by default
    sendDefaultPii: false,

    beforeSend(event) {
      // Backstop to `enabled` above: drop every non-production event so CI/e2e
      // noise never reaches Sentry, even if a DSN leaks into a dev environment.
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
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
