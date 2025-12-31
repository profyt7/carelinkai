import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';

// Initialize Sentry for server-side error tracking
if (SENTRY_DSN && ENVIRONMENT === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Set sample rate
    tracesSampleRate: 1.0,
    
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
      
      return event;
    },
  });
}

export { Sentry };
