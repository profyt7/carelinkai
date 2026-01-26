// TOP OF SERVER CONFIG - Log immediately
console.log('='.repeat(60));
console.log('[SENTRY SERVER CONFIG] File loading at:', new Date().toISOString());
console.log('='.repeat(60));

// This file configures the initialization of Sentry on the server.
import * as Sentry from '@sentry/nextjs';

console.log('[SENTRY SERVER CONFIG] After Sentry import');

// Server-side should use SENTRY_DSN (not NEXT_PUBLIC_SENTRY_DSN)
// Check both env vars explicitly
const RAW_SENTRY_DSN = process.env.SENTRY_DSN;
const RAW_NEXT_PUBLIC_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_DSN = RAW_SENTRY_DSN || RAW_NEXT_PUBLIC_DSN;

// Debug logging to trace initialization
console.log('[SENTRY SERVER CONFIG] === Environment Check ===');
console.log('[SENTRY SERVER CONFIG] process.env.SENTRY_DSN:', RAW_SENTRY_DSN ? `SET (${RAW_SENTRY_DSN.substring(0, 40)}...)` : 'NOT SET');
console.log('[SENTRY SERVER CONFIG] process.env.NEXT_PUBLIC_SENTRY_DSN:', RAW_NEXT_PUBLIC_DSN ? `SET (${RAW_NEXT_PUBLIC_DSN.substring(0, 40)}...)` : 'NOT SET');
console.log('[SENTRY SERVER CONFIG] Final DSN being used:', SENTRY_DSN ? `${SENTRY_DSN.substring(0, 50)}...` : 'NONE');
console.log('[SENTRY SERVER CONFIG] NODE_ENV:', process.env.NODE_ENV);
console.log('[SENTRY SERVER CONFIG] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
console.log('[SENTRY SERVER CONFIG] RENDER_SERVICE_NAME:', process.env.RENDER_SERVICE_NAME || 'not set');

// Only initialize if DSN is provided and valid
if (SENTRY_DSN && SENTRY_DSN.startsWith('https://')) {
  console.log('[SENTRY SERVER CONFIG] DSN is valid, calling Sentry.init()...');
  
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Performance Monitoring - higher for debugging
      tracesSampleRate: 1.0,
      
      // Environment and release tracking
      environment: process.env.NODE_ENV || 'production',
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // ENABLE DEBUG to see internal Sentry logs
      debug: true,
      
      // Error filtering with logging
      beforeSend(event, hint) {
        console.log('[SENTRY SERVER CONFIG] beforeSend called for event:', event.event_id);
        
        // Add server-specific context
        event.tags = event.tags || {};
        event.tags['app.platform'] = 'server';
        event.tags['app.framework'] = 'Next.js';
        event.tags['app.runtime'] = 'node';
        event.tags['app.config_source'] = 'sentry.server.config.ts';
        
        // Add server hostname
        event.server_name = process.env.HOSTNAME || process.env.RENDER_SERVICE_NAME || 'unknown';
        
        return event;
      },
    });
    
    console.log('[SENTRY SERVER CONFIG] Sentry.init() completed');
    
    // Verify initialization
    const client = Sentry.getClient();
    console.log('[SENTRY SERVER CONFIG] ✅ Client exists:', !!client);
    
    if (client) {
      const dsn = client.getDsn();
      console.log('[SENTRY SERVER CONFIG] Client DSN configured:', !!dsn);
      if (dsn) {
        console.log('[SENTRY SERVER CONFIG] DSN details - host:', dsn.host, 'projectId:', dsn.projectId);
      }
      
      const options = client.getOptions();
      console.log('[SENTRY SERVER CONFIG] Client options - env:', options.environment, 'debug:', options.debug);
    } else {
      console.error('[SENTRY SERVER CONFIG] ❌ Client is null after init!');
    }
  } catch (error) {
    console.error('[SENTRY SERVER CONFIG] ❌ EXCEPTION during Sentry.init():', error);
    console.error('[SENTRY SERVER CONFIG] Error stack:', error instanceof Error ? error.stack : 'no stack');
  }
} else {
  console.warn('[SENTRY SERVER CONFIG] ⚠️ DSN not configured or invalid - error tracking DISABLED');
  console.warn('[SENTRY SERVER CONFIG] DSN validation failed:');
  console.warn('[SENTRY SERVER CONFIG]   - SENTRY_DSN value:', RAW_SENTRY_DSN || 'undefined');
  console.warn('[SENTRY SERVER CONFIG]   - NEXT_PUBLIC_SENTRY_DSN value:', RAW_NEXT_PUBLIC_DSN || 'undefined');
  console.warn('[SENTRY SERVER CONFIG]   - Starts with https://:', SENTRY_DSN ? SENTRY_DSN.startsWith('https://') : 'N/A');
}

console.log('[SENTRY SERVER CONFIG] === End of Config ===');
console.log('='.repeat(60));
