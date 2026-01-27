// TOP OF FILE LOG - This runs when the module is first evaluated
console.log('='.repeat(60));
console.log('[INSTRUMENTATION FILE] Module loading at:', new Date().toISOString());
console.log('[INSTRUMENTATION FILE] This log should appear if instrumentation.ts is loaded');
console.log('='.repeat(60));

// This file is used to configure server-side instrumentation
// It runs once when the Next.js server starts
import * as Sentry from '@sentry/nextjs';

console.log('[INSTRUMENTATION FILE] After Sentry import');

export async function register() {
  console.log('='.repeat(60));
  console.log('[Instrumentation] register() called at:', new Date().toISOString());
  console.log('[Instrumentation] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
  console.log('[Instrumentation] NODE_ENV:', process.env.NODE_ENV);
  
  // Import Sentry configs based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Loading sentry.server.config...');
    try {
      await import('./sentry.server.config');
      console.log('[Instrumentation] ✅ sentry.server.config loaded successfully');
    } catch (error) {
      console.error('[Instrumentation] ❌ Error loading sentry.server.config:', error);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[Instrumentation] Loading sentry.edge.config...');
    try {
      await import('./sentry.edge.config');
      console.log('[Instrumentation] ✅ sentry.edge.config loaded successfully');
    } catch (error) {
      console.error('[Instrumentation] ❌ Error loading sentry.edge.config:', error);
    }
  }
  
  // Verify Sentry client after initialization
  const client = Sentry.getClient();
  console.log('[Instrumentation] Sentry client available:', !!client);
  
  console.log('[Instrumentation] ✅ Server instrumentation initialized');
}

export const onRequestError = Sentry.captureRequestError;
