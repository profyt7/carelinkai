import * as Sentry from "@sentry/nextjs";

// Use environment variable for DSN to support multiple environments
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Set environment
    environment: ENVIRONMENT,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: ENVIRONMENT === 'development',
    
    // Enable performance monitoring
    enableTracing: true,
    
    // Capture 100% of transactions for performance monitoring in development
    // In production, adjust this value
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Filter out certain errors
    beforeSend(event, hint) {
      const error = hint?.originalException;
      
      // Ignore Prisma client initialization errors in development
      if (ENVIRONMENT === 'development' && error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        if (message?.includes('PrismaClient')) {
          return null;
        }
      }
      
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
  
  console.log('[Sentry] Server-side initialization successful');
} else {
  console.warn('[Sentry] SENTRY_DSN is not set - error tracking disabled');
}
