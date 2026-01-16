'use client';

import React, { useEffect, useState } from 'react';
import { initializeBugsnagClient, getBugsnagErrorBoundary, isBugsnagInitialized } from '@/lib/bugsnag-client';

interface BugsnagProviderProps {
  children: React.ReactNode;
}

export default function BugsnagProvider({ children }: BugsnagProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [ErrorBoundary, setErrorBoundary] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Initialize Bugsnag on client mount
    console.log('[BugsnagProvider] Initializing...');
    const client = initializeBugsnagClient();
    
    if (client) {
      const boundary = getBugsnagErrorBoundary();
      setErrorBoundary(() => boundary);
      console.log('[BugsnagProvider] ErrorBoundary set:', !!boundary);
    } else {
      console.log('[BugsnagProvider] Client not initialized, using fallback');
      // Get fallback error boundary
      const fallback = getBugsnagErrorBoundary();
      setErrorBoundary(() => fallback);
    }
    
    setIsReady(true);
  }, []);

  // During server-side rendering or before initialization, render children directly
  if (!isReady) {
    return <>{children}</>;
  }

  // If no ErrorBoundary available, render children directly
  if (!ErrorBoundary) {
    return <>{children}</>;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

// Fallback UI for when an error is caught
function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex justify-center">
          <svg
            className="h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Oops! Something went wrong
        </h1>
        
        <p className="mb-6 text-center text-gray-600">
          We've been notified and are working to fix the issue. Please try refreshing the page.
        </p>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh Page
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

// Export a hook to check Bugsnag status
export function useBugsnagStatus() {
  const [status, setStatus] = useState({
    initialized: false,
    windowBugsnag: false,
  });

  useEffect(() => {
    setStatus({
      initialized: isBugsnagInitialized(),
      windowBugsnag: !!(typeof window !== 'undefined' && (window as any).Bugsnag),
    });
  }, []);

  return status;
}
