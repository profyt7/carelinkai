// This file configures the initialization of Sentry on the browser.
// It runs before React hydrates the page.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { scrubPhi } from '@/lib/phi-scrubber';

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

    // HIPAA: never send PII/PHI to Sentry by default
    sendDefaultPii: false,

    // Integrations
    integrations: [
      // Session Replay — mask all inputs (form fields are primary PHI risk in replays)
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      // Browser Tracing
      Sentry.browserTracingIntegration(),
      // Browser Profiling
      Sentry.browserProfilingIntegration(),
      // Note: Sentry feedbackIntegration removed - using custom BugReportButton instead
    ],

    beforeSend(event) {
      // Filter noisy ResizeObserver errors
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      // Scrub PHI/PII from captured events
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

  console.log('[Sentry Client] ✅ Initialized with features:');
  console.log('[Sentry Client]   - Performance Monitoring: enabled');
  console.log('[Sentry Client]   - Session Replay: enabled');
  console.log('[Sentry Client]   - Profiling: enabled');
  console.log('[Sentry Client]   - Metrics: enabled');
  console.log('[Sentry Client]   - Feedback: disabled (using custom BugReportButton)');
} else {
  console.warn('[Sentry Client] ⚠️ No DSN provided, Sentry disabled');
}
