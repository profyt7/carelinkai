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
  });
  
  console.log('[Sentry] Edge initialization successful');
} else if (!SENTRY_DSN) {
  console.warn('[Sentry] SENTRY_DSN is not set - error tracking disabled on edge');
}
