import * as Sentry from "@sentry/nextjs";

// Client-side config MUST use NEXT_PUBLIC_ prefix for runtime access
// process.env variables without NEXT_PUBLIC_ are only available at build time
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

if (isBrowser && SENTRY_DSN) {
  try {
    // Only initialize if not already initialized
    if (!Sentry.isInitialized()) {
      Sentry.init({
        dsn: SENTRY_DSN,

        // Set environment
        environment: ENVIRONMENT,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: ENVIRONMENT === 'development',

        replaysOnErrorSampleRate: 1.0,

        // This sets the sample rate to be 10%. You may want this to be 100% while
        // in development and sample at a lower rate in production
        replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.1,

        // You can remove this option if you're not planning to use the Sentry Session Replay feature:
        integrations: [
          Sentry.replayIntegration({
            // Additional Replay configuration goes in here, for example:
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        
        // Suppress connection timeout errors in console
        beforeSend(event, hint) {
          const error = hint?.originalException;
          
          // Don't send connection timeout errors to Sentry (they clutter the dashboard)
          if (error && typeof error === 'object' && 'code' in error) {
            const code = (error as any).code;
            if (code === 'ETIMEDOUT' || code === 'ENETUNREACH') {
              return null;
            }
          }
          
          return event;
        },
      });
      
      console.log('[Sentry] Client-side initialization successful');
    } else {
      console.log('[Sentry] Client already initialized');
    }
  } catch (error) {
    console.error('[Sentry] Client initialization failed:', error);
  }
} else if (!isBrowser) {
  console.log('[Sentry] Not running in browser environment');
} else if (!SENTRY_DSN) {
  console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN is not set - error tracking disabled on client');
}
