// This file configures the initialization of Sentry on the server.
import * as Sentry from '@sentry/nextjs';

// Server-side should use SENTRY_DSN (not NEXT_PUBLIC_SENTRY_DSN)
// SENTRY_DSN is for server-side only and won't be exposed to the client
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Debug logging to trace initialization
console.log('[Sentry Server Config] Starting initialization...');
console.log('[Sentry Server Config] SENTRY_DSN available:', !!process.env.SENTRY_DSN);
console.log('[Sentry Server Config] NEXT_PUBLIC_SENTRY_DSN available:', !!process.env.NEXT_PUBLIC_SENTRY_DSN);
console.log('[Sentry Server Config] Using DSN:', SENTRY_DSN ? `${SENTRY_DSN.substring(0, 30)}...` : 'NOT SET');
console.log('[Sentry Server Config] NODE_ENV:', process.env.NODE_ENV);
console.log('[Sentry Server Config] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);

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
    
    // Verify initialization
    const client = Sentry.getClient();
    console.log('[Sentry Server Config] ✅ Sentry initialized successfully, client:', !!client);
    
    if (client) {
      const dsn = client.getDsn();
      console.log('[Sentry Server Config] Client DSN configured:', !!dsn);
    }
  } catch (error) {
    console.error('[Sentry Server Config] ❌ Error initializing Sentry:', error);
  }
} else {
  console.warn('[Sentry Server Config] ⚠️ DSN not configured or invalid - error tracking disabled');
  console.warn('[Sentry Server Config] DSN value:', SENTRY_DSN || 'undefined');
}
