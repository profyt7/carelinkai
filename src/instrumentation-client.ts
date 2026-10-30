// This file configures the initialization of Sentry on the browser.
// It runs before React hydrates the page.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { scrubPhi } from '@/lib/phi-scrubber';
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry/scrub-event';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Debug logging
console.log('[Sentry Client] Initializing...');
console.log('[Sentry Client] DSN available:', !!SENTRY_DSN);
console.log('[Sentry Client] Environment:', process.env.NODE_ENV);

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Report ONLY from production. CI/e2e runs (NODE_ENV=development on
    // localhost) were the source of dev-tagged noise (CARELINK-AI-16/-17). The
    // beforeSend guard below is the backstop to this flag.
    enabled: process.env.NODE_ENV === 'production',

    // Performance Monitoring - capture 10% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling - capture profiling data for sampled transactions
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment tracking
    environment: process.env.NODE_ENV || 'development',

    // Debug mode in development
    debug: process.env.NODE_ENV !== 'production',

    // HIPAA: never send PII/PHI to Sentry by default
    sendDefaultPii: false,

    // Drop known third-party browser noise (browser extensions / email link-scanners /
    // client adblockers) so it doesn't burn Sentry quota. None of these are app errors.
    ignoreErrors: [
      // MS Outlook "SafeLink" / extension false positive on link pre-fetch
      'Object Not Found Matching Id',
      'Non-Error promise rejection captured with value: Object Not Found Matching Id',
      // Client adblocker/network blocking js.stripe.com
      'Failed to load Stripe.js',
    ],

    // Integrations
    integrations: [
      // OL-230: Session Replay removed. It recorded page URLs (search ?q=) and unmasked page
      // text (typed search terms echoed on /search, names on dashboards). Don't re-add without
      // maskAllText + URL scrubbing verified.
      // Browser Tracing
      Sentry.browserTracingIntegration(),
      // Browser Profiling
      Sentry.browserProfilingIntegration(),
      // Note: Sentry feedbackIntegration removed - using the custom bug-report modal (SupportDock) instead
    ],

    beforeSend(event) {
      // Backstop to `enabled` above: drop every non-production event so CI/e2e
      // noise never reaches Sentry, even if a DSN leaks into a dev environment.
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      // Filter noisy ResizeObserver errors
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      // Belt-and-suspenders for the known third-party noise above: these often arrive as
      // a promise-rejection `message` rather than an exception value, which ignoreErrors
      // can miss. Drop them so they don't burn quota.
      const noise = ['Object Not Found Matching Id', 'Failed to load Stripe.js'];
      const haystack = `${event.message ?? ''} ${event.exception?.values?.[0]?.value ?? ''}`;
      if (noise.some((n) => haystack.includes(n))) {
        return null;
      }
      // OL-226/230: strip query strings from every URL, trim error text that echoes input.
      scrubEvent(event);
      // Scrub PHI/PII from captured events
      if (event.request?.data) {
        event.request.data = scrubPhi(event.request.data);
      }
      if (event.extra) {
        event.extra = scrubPhi(event.extra) as Record<string, unknown>;
      }
      return event;
    },

    beforeSendTransaction(event) {
      return scrubEvent(event);
    },

    beforeBreadcrumb(breadcrumb) {
      // OL-226/230: console breadcrumbs never reach Sentry; navigation/fetch URLs lose their
      // query string (/search?q=…).
      if (!scrubBreadcrumb(breadcrumb)) return null;
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
  console.log('[Sentry Client]   - Feedback: disabled (using the custom bug-report modal)');
} else {
  console.warn('[Sentry Client] ⚠️ No DSN provided, Sentry disabled');
}
