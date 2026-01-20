// This file configures the initialization of Sentry for edge runtimes.
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is provided and valid
if (SENTRY_DSN && SENTRY_DSN.startsWith('https://')) {
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
  
  console.log('✅ Sentry edge initialized');
}
