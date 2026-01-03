import * as Sentry from "@sentry/nextjs";

// Client-side config MUST use NEXT_PUBLIC_ prefix for runtime access
// process.env variables without NEXT_PUBLIC_ are only available at build time
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// ====== COMPREHENSIVE DEBUG LOGGING ======
console.log('[Sentry Debug] ==================== CLIENT CONFIG ====================');
console.log('[Sentry Debug] Browser Environment:', isBrowser);
console.log('[Sentry Debug] NEXT_PUBLIC_SENTRY_DSN exists:', !!SENTRY_DSN);
console.log('[Sentry Debug] NEXT_PUBLIC_SENTRY_DSN length:', SENTRY_DSN ? SENTRY_DSN.length : 0);
console.log('[Sentry Debug] NODE_ENV:', ENVIRONMENT);
console.log('[Sentry Debug] Sentry already initialized:', isBrowser ? Sentry.isInitialized() : 'N/A (not in browser)');
console.log('[Sentry Debug] Window object exists:', typeof window !== 'undefined');
console.log('[Sentry Debug] Document object exists:', typeof document !== 'undefined');
console.log('[Sentry Debug] ================================================================');

if (isBrowser && SENTRY_DSN) {
  try {
    // Only initialize if not already initialized
    if (!Sentry.isInitialized()) {
      console.log('[Sentry Debug] Attempting to initialize client-side Sentry...');
      
      Sentry.init({
        dsn: SENTRY_DSN,

        // Set environment
        environment: ENVIRONMENT,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

        // Enable debug mode only in development
        // TEMPORARY: Enabled in production for troubleshooting - TODO: revert after debugging
        debug: true,

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
          console.log('[Sentry Debug] beforeSend called - event will be sent to Sentry');
          const error = hint?.originalException;
          
          // Don't send connection timeout errors to Sentry (they clutter the dashboard)
          if (error && typeof error === 'object' && 'code' in error) {
            const code = (error as any).code;
            if (code === 'ETIMEDOUT' || code === 'ENETUNREACH') {
              console.log('[Sentry Debug] Suppressing timeout error:', code);
              return null;
            }
          }
          
          return event;
        },
      });
      
      console.log('[Sentry] ✅ Client-side initialization successful');
      console.log('[Sentry Debug] Sentry.isInitialized():', Sentry.isInitialized());
    } else {
      console.log('[Sentry] Client already initialized');
    }
  } catch (error) {
    console.error('[Sentry] ❌ Client initialization failed:', error);
    console.error('[Sentry Debug] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} else if (!isBrowser) {
  console.log('[Sentry] ⚠️ Not running in browser environment (this is normal during SSR)');
} else if (!SENTRY_DSN) {
  console.error('[Sentry] ❌ CRITICAL: NEXT_PUBLIC_SENTRY_DSN is not set - error tracking disabled on client');
  console.error('[Sentry Debug] This MUST be set in Render environment variables!');
}
