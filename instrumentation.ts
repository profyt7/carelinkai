// This file is used to configure server-side instrumentation
// It runs once when the Next.js server starts
export async function register() {
  // Only run on server
  if (typeof window === 'undefined') {
    // Initialize Bugsnag server
    const { initializeBugsnagServer } = await import('@/lib/bugsnag-server');
    initializeBugsnagServer();
    
    console.log('✅ Server instrumentation initialized');
  }
}
