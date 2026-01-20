// This file configures the initialization of Sentry on the server.
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
    
    // Server-specific configuration
    integrations: [
      // Add server-specific integrations as needed
    ],
    
    // Error filtering
    beforeSend(event) {
      // Add server-specific context
      event.tags = event.tags || {};
      event.tags['app.platform'] = 'server';
      event.tags['app.framework'] = 'Next.js';
      event.tags['app.runtime'] = 'node';
      
      // Add server hostname
      event.server_name = process.env.HOSTNAME || process.env.RENDER_SERVICE_NAME || 'unknown';
      
      return event;
    },
    
    // Debug mode in development
    debug: process.env.NODE_ENV !== 'production',
  });
  
  console.log('✅ Sentry server initialized');
} else {
  console.log('[Sentry Server] DSN not configured - error tracking disabled');
}
