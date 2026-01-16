import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
import React from 'react';

let bugsnagClient: typeof Bugsnag | null = null;
let initializationAttempted = false;

export function initializeBugsnagClient() {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (bugsnagClient) {
    return bugsnagClient;
  }

  // Prevent multiple initialization attempts
  if (initializationAttempted) {
    return null;
  }
  initializationAttempted = true;

  const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;
  
  console.log('[Bugsnag Client] Attempting initialization...');
  console.log('[Bugsnag Client] API Key present:', !!apiKey);
  console.log('[Bugsnag Client] API Key length:', apiKey?.length);
  console.log('[Bugsnag Client] NODE_ENV:', process.env.NODE_ENV);

  // Don't initialize if no API key is provided
  if (!apiKey || apiKey === 'YOUR_BUGSNAG_API_KEY_HERE' || apiKey.length < 32) {
    console.warn('[Bugsnag Client] API key not configured or invalid. Error tracking is disabled.');
    return null;
  }

  try {
    // Determine release stage - default to 'production' for deployed environments
    const releaseStage = process.env.NEXT_PUBLIC_BUGSNAG_RELEASE_STAGE || 
                         process.env.NODE_ENV || 
                         'production';
    
    console.log('[Bugsnag Client] Release stage:', releaseStage);

    bugsnagClient = Bugsnag.start({
      apiKey,
      plugins: [new BugsnagPluginReact()],
      // Enable all release stages to ensure errors are always captured
      enabledReleaseStages: ['production', 'staging', 'development'],
      releaseStage,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // Auto-detect unhandled errors
      autoDetectErrors: true,
      autoTrackSessions: true,
      
      // Error handling configuration
      onError: (event) => {
        console.log('[Bugsnag Client] Error captured:', event.errors?.[0]?.errorMessage);
        
        // Add custom metadata to all errors
        event.addMetadata('app', {
          platform: 'web',
          framework: 'Next.js',
          environment: process.env.NODE_ENV,
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        });
        
        // Add user context if available
        if (typeof window !== 'undefined' && (window as any).__user) {
          event.setUser(
            (window as any).__user.id,
            (window as any).__user.email,
            (window as any).__user.name
          );
        }
        
        return true;
      },
      
      // Enable breadcrumbs for better error context
      enabledBreadcrumbTypes: [
        'navigation',
        'request',
        'process',
        'log',
        'user',
        'state',
        'error',
        'manual',
      ],
    });

    // Expose Bugsnag on window for debugging
    if (typeof window !== 'undefined') {
      (window as any).Bugsnag = bugsnagClient;
    }

    console.log('✅ Bugsnag client initialized successfully');
    console.log('[Bugsnag Client] Bugsnag object available on window:', !!(window as any).Bugsnag);
    
    return bugsnagClient;
  } catch (error) {
    console.error('[Bugsnag Client] Failed to initialize Bugsnag:', error);
    return null;
  }
}

export function getBugsnagClient() {
  if (typeof window === 'undefined') {
    return null;
  }
  return bugsnagClient || initializeBugsnagClient();
}

// Check if Bugsnag is properly initialized
export function isBugsnagInitialized(): boolean {
  return bugsnagClient !== null;
}

// React Error Boundary component
export function getBugsnagErrorBoundary() {
  const client = getBugsnagClient();
  
  if (!client) {
    // Return a simple error boundary if Bugsnag is not configured
    return class ErrorBoundary extends React.Component<
      { children: React.ReactNode; FallbackComponent?: React.ComponentType },
      { hasError: boolean }
    > {
      constructor(props: { children: React.ReactNode; FallbackComponent?: React.ComponentType }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[Fallback ErrorBoundary] Error caught:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          const FallbackComponent = this.props.FallbackComponent;
          if (FallbackComponent) {
            return <FallbackComponent />;
          }
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>Something went wrong.</h1>
              <button onClick={() => this.setState({ hasError: false })}>
                Try again
              </button>
            </div>
          );
        }

        return this.props.children;
      }
    };
  }

  const plugin = client.getPlugin('react');
  if (!plugin) {
    console.warn('[Bugsnag Client] React plugin not found');
    return null;
  }
  
  return plugin.createErrorBoundary(React);
}

// Export a method to manually notify Bugsnag
export function notifyBugsnag(error: Error, metadata?: Record<string, any>) {
  const client = getBugsnagClient();
  
  if (client) {
    console.log('[Bugsnag Client] Manually notifying error:', error.message);
    client.notify(error, (event) => {
      if (metadata) {
        event.addMetadata('custom', metadata);
      }
    });
  } else {
    console.error('[Bugsnag Client] Not initialized. Error:', error.message, metadata);
  }
}

// Export a method to leave breadcrumbs
export function leaveBreadcrumb(message: string, metadata?: Record<string, any>) {
  const client = getBugsnagClient();
  
  if (client) {
    client.leaveBreadcrumb(message, metadata);
  }
}

// Test function to verify Bugsnag is working
export function testBugsnagClient() {
  console.log('[Bugsnag Client] Running test...');
  console.log('[Bugsnag Client] Initialized:', isBugsnagInitialized());
  console.log('[Bugsnag Client] Window.Bugsnag:', !!(typeof window !== 'undefined' && (window as any).Bugsnag));
  
  const testError = new Error('Bugsnag Client Test Error - ' + new Date().toISOString());
  notifyBugsnag(testError, { test: true, source: 'testBugsnagClient' });
  
  return {
    initialized: isBugsnagInitialized(),
    windowBugsnag: !!(typeof window !== 'undefined' && (window as any).Bugsnag),
    testErrorSent: true,
  };
}
