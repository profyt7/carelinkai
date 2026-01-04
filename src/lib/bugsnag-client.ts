import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
import React from 'react';

let bugsnagClient: typeof Bugsnag | null = null;

export function initializeBugsnagClient() {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (bugsnagClient) {
    return bugsnagClient;
  }

  const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;

  // Don't initialize if no API key is provided
  if (!apiKey || apiKey === 'YOUR_BUGSNAG_API_KEY_HERE') {
    console.warn('Bugsnag API key not configured. Error tracking is disabled.');
    return null;
  }

  try {
    bugsnagClient = Bugsnag.start({
      apiKey,
      plugins: [new BugsnagPluginReact()],
      enabledReleaseStages: ['production', 'staging'],
      releaseStage: process.env.NODE_ENV || 'development',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // Error handling configuration
      onError: (event) => {
        // Add custom metadata to all errors
        event.addMetadata('app', {
          platform: 'web',
          framework: 'Next.js',
          environment: process.env.NODE_ENV,
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

    console.log('✅ Bugsnag client initialized successfully');
    return bugsnagClient;
  } catch (error) {
    console.error('Failed to initialize Bugsnag:', error);
    return null;
  }
}

export function getBugsnagClient() {
  return bugsnagClient || initializeBugsnagClient();
}

// React Error Boundary component
export function getBugsnagErrorBoundary() {
  const client = getBugsnagClient();
  
  if (!client) {
    // Return a simple error boundary if Bugsnag is not configured
    return class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
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
  return plugin ? plugin.createErrorBoundary(React) : null;
}

// Export a method to manually notify Bugsnag
export function notifyBugsnag(error: Error, metadata?: Record<string, any>) {
  const client = getBugsnagClient();
  
  if (client) {
    client.notify(error, (event) => {
      if (metadata) {
        event.addMetadata('custom', metadata);
      }
    });
  } else {
    console.error('Bugsnag not initialized. Error:', error, metadata);
  }
}

// Export a method to leave breadcrumbs
export function leaveBreadcrumb(message: string, metadata?: Record<string, any>) {
  const client = getBugsnagClient();
  
  if (client) {
    client.leaveBreadcrumb(message, metadata);
  }
}
