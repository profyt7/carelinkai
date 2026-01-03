import * as Sentry from "@sentry/nextjs";

// Use environment variable for DSN to support multiple environments
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// ====== COMPREHENSIVE DEBUG LOGGING ======
console.log('[Sentry Debug] ==================== SERVER CONFIG ====================');
console.log('[Sentry Debug] SENTRY_DSN exists:', !!process.env.SENTRY_DSN);
console.log('[Sentry Debug] NEXT_PUBLIC_SENTRY_DSN exists:', !!process.env.NEXT_PUBLIC_SENTRY_DSN);
console.log('[Sentry Debug] Using DSN:', SENTRY_DSN ? 'FOUND' : 'MISSING');
console.log('[Sentry Debug] DSN length:', SENTRY_DSN ? SENTRY_DSN.length : 0);
console.log('[Sentry Debug] NODE_ENV:', ENVIRONMENT);
console.log('[Sentry Debug] Sentry already initialized:', Sentry.isInitialized());
console.log('[Sentry Debug] ================================================================');

if (SENTRY_DSN) {
  try {
    console.log('[Sentry Debug] Attempting to initialize server-side Sentry...');
    
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Use tunnel to proxy events through our server
      // This bypasses network restrictions and firewall issues
      tunnel: '/api/sentry-tunnel',

      // Set environment
      environment: ENVIRONMENT,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

      // Enable debug mode only in development
      // TEMPORARY: Enabled in production for troubleshooting - TODO: revert after debugging
      debug: true,
      
      // Enable performance monitoring
      enableTracing: true,
      
      // Capture 100% of transactions for performance monitoring in development
      // In production, adjust this value
      profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
      
      // Filter out certain errors
      beforeSend(event, hint) {
        console.log('[Sentry Debug] Server beforeSend called - event will be sent to Sentry');
        const error = hint?.originalException;
        
        // Ignore Prisma client initialization errors in development
        if (ENVIRONMENT === 'development' && error && typeof error === 'object' && 'message' in error) {
          const message = (error as any).message;
          if (message?.includes('PrismaClient')) {
            console.log('[Sentry Debug] Suppressing Prisma error');
            return null;
          }
        }
        
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
    
    console.log('[Sentry] ✅ Server-side initialization successful');
    console.log('[Sentry Debug] Sentry.isInitialized():', Sentry.isInitialized());
  } catch (error) {
    console.error('[Sentry] ❌ Server initialization failed:', error);
    console.error('[Sentry Debug] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} else {
  console.error('[Sentry] ❌ CRITICAL: SENTRY_DSN is not set - error tracking disabled on server');
  console.error('[Sentry Debug] Set either SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN in Render environment variables!');
}
