import Bugsnag from '@bugsnag/node';

let bugsnagServer: typeof Bugsnag | null = null;
let initializationAttempted = false;

export function initializeBugsnagServer() {
  // Only run on server
  if (typeof window !== 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (bugsnagServer) {
    return bugsnagServer;
  }

  // Prevent multiple initialization attempts
  if (initializationAttempted) {
    return null;
  }
  initializationAttempted = true;

  const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;

  console.log('[Bugsnag Server] Attempting initialization...');
  console.log('[Bugsnag Server] API Key present:', !!apiKey);
  console.log('[Bugsnag Server] API Key length:', apiKey?.length);
  console.log('[Bugsnag Server] NODE_ENV:', process.env.NODE_ENV);

  // Don't initialize if no API key is provided
  if (!apiKey || apiKey === 'YOUR_BUGSNAG_API_KEY_HERE' || apiKey.length < 32) {
    console.warn('[Bugsnag Server] API key not configured or invalid. Server error tracking is disabled.');
    return null;
  }

  try {
    // Determine release stage - default to 'production' for deployed environments
    const releaseStage = process.env.NEXT_PUBLIC_BUGSNAG_RELEASE_STAGE || 
                         process.env.NODE_ENV || 
                         'production';
    
    console.log('[Bugsnag Server] Release stage:', releaseStage);

    bugsnagServer = Bugsnag.start({
      apiKey,
      // Enable all release stages to ensure errors are always captured
      enabledReleaseStages: ['production', 'staging', 'development'],
      releaseStage,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // Auto-detect unhandled errors
      autoDetectErrors: true,
      autoTrackSessions: true,
      
      // Server-specific configuration
      onError: (event) => {
        // Ensure we have a valid error object
        if (!event.errors || event.errors.length === 0) {
          console.warn('[Bugsnag Server] Received event with no errors');
          return false;
        }
        
        console.log('[Bugsnag Server] Error captured:', event.errors[0]?.errorMessage);
        
        // Add server-specific metadata
        event.addMetadata('server', {
          platform: 'node',
          framework: 'Next.js',
          environment: process.env.NODE_ENV,
          nodeVersion: process.version,
          hostname: process.env.HOSTNAME || process.env.RENDER_SERVICE_NAME || 'unknown',
        });
        
        return true;
      },
      
      // Enable breadcrumbs for better error context
      enabledBreadcrumbTypes: [
        'request',
        'process',
        'log',
        'error',
        'manual',
      ],
    });

    console.log('✅ Bugsnag server initialized successfully');
    return bugsnagServer;
  } catch (error) {
    console.error('[Bugsnag Server] Failed to initialize:', error);
    return null;
  }
}

export function getBugsnagServer() {
  if (typeof window !== 'undefined') {
    return null;
  }
  return bugsnagServer || initializeBugsnagServer();
}

// Check if Bugsnag server is properly initialized
export function isBugsnagServerInitialized(): boolean {
  return bugsnagServer !== null;
}

// Export a method to manually notify Bugsnag from server
export function notifyBugsnagServer(error: Error | unknown, metadata?: Record<string, any>) {
  const server = getBugsnagServer();
  
  // Ensure we have a proper Error object
  const errorObj = error instanceof Error 
    ? error 
    : new Error(String(error || 'Unknown error'));
  
  if (server) {
    console.log('[Bugsnag Server] Manually notifying error:', errorObj.message);
    server.notify(errorObj, (event) => {
      if (metadata) {
        event.addMetadata('custom', metadata);
      }
      // If the original error wasn't an Error instance, add that info
      if (!(error instanceof Error)) {
        event.addMetadata('debug', {
          originalErrorType: typeof error,
          originalErrorValue: error,
        });
      }
    });
  } else {
    console.error('[Bugsnag Server] Not initialized. Error:', errorObj.message, metadata);
  }
}

// Export a method to leave breadcrumbs on server
export function leaveBreadcrumbServer(message: string, metadata?: Record<string, any>) {
  const server = getBugsnagServer();
  
  if (server) {
    server.leaveBreadcrumb(message, metadata);
  }
}

// Middleware wrapper for catching errors in API routes
export function withBugsnagServerError<T>(
  handler: (req: any, res: any) => Promise<T>
) {
  return async (req: any, res: any) => {
    try {
      return await handler(req, res);
    } catch (error) {
      // Ensure we have a proper Error object before notifying Bugsnag
      const errorObj = error instanceof Error 
        ? error 
        : new Error(String(error || 'Unknown error'));
      
      notifyBugsnagServer(errorObj, {
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
        },
        originalError: error,
      });
      throw errorObj;
    }
  };
}

// Test function to verify Bugsnag server is working
export function testBugsnagServer() {
  console.log('[Bugsnag Server] Running test...');
  console.log('[Bugsnag Server] Initialized:', isBugsnagServerInitialized());
  
  const testError = new Error('Bugsnag Server Test Error - ' + new Date().toISOString());
  notifyBugsnagServer(testError, { test: true, source: 'testBugsnagServer' });
  
  return {
    initialized: isBugsnagServerInitialized(),
    testErrorSent: true,
  };
}
