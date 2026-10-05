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
    await import('../sentry.server.config');

    // Warm the shared Prisma client at boot (platform detection + engine load
    // + first connection) so no request pays the multi-second cold-start span
    // (prisma:client:detect_platform p95 8.9 s). Never throws; skipped in
    // builds/tests where no DATABASE_URL is configured.
    if (process.env.DATABASE_URL && process.env.PRISMA_WARMUP !== '0') {
      const { warmPrisma } = await import('@/lib/prisma-warmup');
      await warmPrisma();
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[Instrumentation] Loading edge config...');
    await import('../sentry.edge.config');
  }
}

// This captures errors from Server Components, Route Handlers, and Server Actions
// Requires @sentry/nextjs >= 8.28.0 and Next.js >= 15
export const onRequestError = Sentry.captureRequestError;
