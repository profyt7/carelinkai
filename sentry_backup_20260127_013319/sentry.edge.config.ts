// This file configures the initialization of Sentry for edge runtimes.
import * as Sentry from '@sentry/nextjs';

// Edge runtime should also use SENTRY_DSN with fallback to NEXT_PUBLIC_SENTRY_DSN
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log('[Sentry Edge Config] Starting initialization...');
console.log('[Sentry Edge Config] DSN available:', !!SENTRY_DSN);

// Only initialize if DSN is provided and valid
if (SENTRY_DSN && SENTRY_DSN.startsWith('https://')) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Environment and release tracking
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // Error filtering
      beforeSend(event) {
        event.tags = event.tags || {};
        event.tags['app.platform'] = 'edge';
        event.tags['app.framework'] = 'Next.js';
        return event;
      },
    });
    
    console.log('[Sentry Edge Config] ✅ Sentry edge initialized successfully');
  } catch (error) {
    console.error('[Sentry Edge Config] ❌ Error initializing Sentry:', error);
  }
} else {
  console.warn('[Sentry Edge Config] ⚠️ DSN not configured - error tracking disabled');
}
