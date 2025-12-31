/**
 * Instrumentation for Next.js App Router
 * This file is automatically loaded by Next.js to initialize monitoring tools
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/sentry.server');
  }
  
  // Only run on Edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./lib/sentry.server');
  }
}
