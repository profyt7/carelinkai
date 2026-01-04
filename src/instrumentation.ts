/**
 * Instrumentation for Next.js App Router
 * This file is automatically loaded by Next.js to initialize monitoring tools
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Initialize Bugsnag for server-side error tracking
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize Bugsnag server
    const { initializeBugsnagServer } = await import('./lib/bugsnag-server');
    initializeBugsnagServer();
    console.log('✅ Bugsnag server initialized via instrumentation.ts');
  }
  
  // Note: Edge runtime support can be added later if needed
  // For now, we focus on Node.js runtime for server-side tracking
}
