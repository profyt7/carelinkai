import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';

// Initialize Sentry for client-side error tracking
if (SENTRY_DSN && typeof window !== 'undefined') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Set sample rate to 100% in production (adjust based on traffic)
    tracesSampleRate: 1.0,
    
    // Session Replay for debugging user sessions
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter out certain errors
    beforeSend(event, hint) {
      const error = hint?.originalException;
      
      // Ignore hydration errors (Next.js specific)
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        if (
          message?.includes('Hydration failed') ||
          message?.includes('There was an error while hydrating') ||
          message?.includes('Text content does not match')
        ) {
          return null; // Don't send to Sentry
        }
      }
      
      // Ignore network errors
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      
      return event;
    },
    
    // Integrations - Using simplified approach for Next.js
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export { Sentry };
