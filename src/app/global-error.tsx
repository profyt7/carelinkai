'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        'error.boundary': 'global',
        'error.digest': error.digest || 'unknown',
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
              <FiAlertTriangle className="text-red-600 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-800 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-neutral-600 mb-6">
              We're sorry, but something unexpected happened. Our team has been
              automatically notified and is working on a fix.
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <details className="mb-6 text-left bg-neutral-100 p-4 rounded text-sm">
                <summary className="cursor-pointer font-medium text-neutral-700">
                  Error Details
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-red-600">
                  {error.message}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                </pre>
              </details>
            )}
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => reset()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <FiRefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex items-center justify-center gap-2 border border-neutral-300 bg-white text-neutral-700 px-6 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
              >
                <FiHome className="w-4 h-4" />
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
