// This file is used to configure server-side instrumentation
// It runs once when the Next.js server starts
import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Import Sentry configs based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
  
  console.log('✅ Server instrumentation initialized');
}

export const onRequestError = Sentry.captureRequestError;
