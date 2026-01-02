import * as Sentry from "@sentry/nextjs";

// Use environment variable for DSN to support multiple environments
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Only initialize Sentry if DSN is provided and not already initialized
if (SENTRY_DSN && !Sentry.isInitialized()) {
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
  });
  
  console.log('[Sentry] Client-side initialization successful');
} else if (!SENTRY_DSN) {
  console.warn('[Sentry] SENTRY_DSN is not set - error tracking disabled on client');
}
