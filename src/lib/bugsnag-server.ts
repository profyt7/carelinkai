import Bugsnag from '@bugsnag/js';

let bugsnagServer: typeof Bugsnag | null = null;

export function initializeBugsnagServer() {
  // Only run on server
  if (typeof window !== 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (bugsnagServer) {
    return bugsnagServer;
  }

  const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;

  // Don't initialize if no API key is provided
  if (!apiKey || apiKey === 'YOUR_BUGSNAG_API_KEY_HERE') {
    console.warn('Bugsnag API key not configured. Server error tracking is disabled.');
    return null;
  }

  try {
    bugsnagServer = Bugsnag.start({
      apiKey,
      enabledReleaseStages: ['production', 'staging'],
      releaseStage: process.env.NODE_ENV || 'development',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // Server-specific configuration
      onError: (event) => {
        // Add server-specific metadata
        event.addMetadata('server', {
          platform: 'node',
          framework: 'Next.js',
          environment: process.env.NODE_ENV,
          nodeVersion: process.version,
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
    console.error('Failed to initialize Bugsnag server:', error);
    return null;
  }
}

export function getBugsnagServer() {
  return bugsnagServer || initializeBugsnagServer();
}

// Export a method to manually notify Bugsnag from server
export function notifyBugsnagServer(error: Error, metadata?: Record<string, any>) {
  const server = getBugsnagServer();
  
  if (server) {
    server.notify(error, (event) => {
      if (metadata) {
        event.addMetadata('custom', metadata);
      }
    });
  } else {
    console.error('Bugsnag server not initialized. Error:', error, metadata);
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
      notifyBugsnagServer(error as Error, {
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
        },
      });
      throw error;
    }
  };
}
