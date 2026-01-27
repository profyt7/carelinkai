// instrumentation.ts - Next.js 15 instrumentation hook
// https://nextjs.org/docs/app/guides/instrumentation
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

import * as Sentry from '@sentry/nextjs';

console.log('[Instrumentation] Module loaded at:', new Date().toISOString());

export async function register() {
  console.log('[Instrumentation] register() called');
  console.log('[Instrumentation] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Loading server config...');
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[Instrumentation] Loading edge config...');
    await import('./sentry.edge.config');
  }
}

// This captures errors from Server Components, Route Handlers, and Server Actions
// Requires @sentry/nextjs >= 8.28.0 and Next.js >= 15
export const onRequestError = Sentry.captureRequestError;
