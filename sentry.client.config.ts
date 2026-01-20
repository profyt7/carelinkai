// This file configures the initialization of Sentry on the browser.
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is provided and valid
if (SENTRY_DSN && SENTRY_DSN.startsWith('https://')) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay (sampling rate for error sessions and regular sessions)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Enable profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Environment and release tracking
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    
    // Integrations
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],
    
    // Breadcrumbs configuration
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs if needed
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
    
    // Error filtering
    beforeSend(event, hint) {
      // Add custom context
      event.tags = event.tags || {};
      event.tags['app.platform'] = 'web';
      event.tags['app.framework'] = 'Next.js';
      
      // Filter out known non-critical errors
      const error = hint?.originalException;
      if (error instanceof Error) {
        // Ignore ResizeObserver errors (common in Chrome)
        if (error.message?.includes('ResizeObserver')) {
          return null;
        }
        // Ignore cancelled network requests
        if (error.message?.includes('AbortError') || error.message?.includes('cancelled')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Debug mode in development
    debug: process.env.NODE_ENV !== 'production',
    
    // Ignore specific URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
    ],
  });
  
  console.log('✅ Sentry client initialized');
} else {
  console.log('[Sentry] DSN not configured - error tracking disabled');
}
