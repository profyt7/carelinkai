import * as Sentry from "@sentry/nextjs";

// Use environment variable for DSN to support multiple environments
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// ====== COMPREHENSIVE DEBUG LOGGING ======
console.log('[Sentry Debug] ==================== EDGE CONFIG ====================');
console.log('[Sentry Debug] SENTRY_DSN exists:', !!process.env.SENTRY_DSN);
console.log('[Sentry Debug] NEXT_PUBLIC_SENTRY_DSN exists:', !!process.env.NEXT_PUBLIC_SENTRY_DSN);
console.log('[Sentry Debug] Using DSN:', SENTRY_DSN ? 'FOUND' : 'MISSING');
console.log('[Sentry Debug] DSN length:', SENTRY_DSN ? SENTRY_DSN.length : 0);
console.log('[Sentry Debug] NODE_ENV:', ENVIRONMENT);
console.log('[Sentry Debug] Sentry already initialized:', Sentry.isInitialized());
console.log('[Sentry Debug] ================================================================');

// Only initialize Sentry if DSN is provided and not already initialized
if (SENTRY_DSN && !Sentry.isInitialized()) {
  try {
    console.log('[Sentry Debug] Attempting to initialize edge Sentry...');
    
    Sentry.init({
      dsn: SENTRY_DSN,

      // Set environment
      environment: ENVIRONMENT,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

      // TEMPORARY: Enable debug mode even in production to see what's happening
      debug: true, // Force debug mode for troubleshooting
    });
    
    console.log('[Sentry] ✅ Edge initialization successful');
    console.log('[Sentry Debug] Sentry.isInitialized():', Sentry.isInitialized());
  } catch (error) {
    console.error('[Sentry] ❌ Edge initialization failed:', error);
    console.error('[Sentry Debug] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} else if (!SENTRY_DSN) {
  console.error('[Sentry] ❌ CRITICAL: SENTRY_DSN is not set - error tracking disabled on edge');
  console.error('[Sentry Debug] Set either SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN in Render environment variables!');
} else {
  console.log('[Sentry] Edge already initialized');
}
