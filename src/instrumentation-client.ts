// This file configures the initialization of Sentry on the browser.
// It runs before React hydrates the page.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Debug logging
console.log('[Sentry Client] Initializing...');
console.log('[Sentry Client] DSN available:', !!SENTRY_DSN);
console.log('[Sentry Client] Environment:', process.env.NODE_ENV);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring - capture 10% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling - capture profiling data for sampled transactions
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay - capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode in development
    debug: process.env.NODE_ENV !== 'production',

    // Enable sending default PII
    sendDefaultPii: true,

    // Integrations
    integrations: [
      // Session Replay
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      // Browser Tracing
      Sentry.browserTracingIntegration(),
      // Browser Profiling
      Sentry.browserProfilingIntegration(),
      // Note: Sentry feedbackIntegration removed - using custom BugReportButton instead
    ],

    // Experimental features
    _experiments: {
      // Enable metrics
      metricsAggregator: true,
    },

    // Filter out noisy errors
    beforeSend(event) {
      // Don't send events for ignored errors
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      return event;
    },
  });

  console.log('[Sentry Client] ✅ Initialized with features:');
  console.log('[Sentry Client]   - Performance Monitoring: enabled');
  console.log('[Sentry Client]   - Session Replay: enabled');
  console.log('[Sentry Client]   - Profiling: enabled');
  console.log('[Sentry Client]   - Metrics: enabled');
  console.log('[Sentry Client]   - Feedback: disabled (using custom BugReportButton)');
} else {
  console.warn('[Sentry Client] ⚠️ No DSN provided, Sentry disabled');
}
