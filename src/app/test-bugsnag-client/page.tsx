'use client';

import { useState } from 'react';
import { notifyBugsnag, leaveBreadcrumb } from '@/lib/bugsnag-client';

export default function TestBugsnagClientPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testClientError = () => {
    try {
      setLoading(true);
      
      // Leave a breadcrumb
      leaveBreadcrumb('Testing Bugsnag client error tracking', {
        page: '/test-bugsnag-client',
        action: 'manual test',
      });

      // Create and notify a test error
      const testError = new Error('Test error from Bugsnag - Client Side');
      notifyBugsnag(testError, {
        test: {
          purpose: 'Verify Bugsnag client-side error tracking',
          timestamp: new Date().toISOString(),
          page: '/test-bugsnag-client',
        },
      });

      setResult('✅ Test error sent to Bugsnag! Check your Bugsnag dashboard.');
    } catch (error) {
      setResult(`❌ Failed to send error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testServerError = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-bugsnag');
      const data = await response.json();
      
      if (data.success) {
        setResult('✅ Server test error sent to Bugsnag! Check your Bugsnag dashboard.');
      } else {
        setResult(`❌ Server test failed: ${data.message}`);
      }
    } catch (error) {
      setResult(`❌ Failed to test server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testThrowError = () => {
    // This will be caught by the error boundary
    throw new Error('Test uncaught error - Should be caught by Bugsnag Error Boundary');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Bugsnag Error Tracking Test
          </h1>
          <p className="mb-8 text-gray-600">
            Use the buttons below to test Bugsnag error tracking on both client and server sides.
          </p>

          <div className="space-y-4">
            {/* Client-side test */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                Client-Side Error Test
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Manually notify Bugsnag of an error from the browser.
              </p>
              <button
                onClick={testClientError}
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Sending...' : 'Test Client Error'}
              </button>
            </div>

            {/* Server-side test */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                Server-Side Error Test
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Call the test API endpoint to send a server-side error to Bugsnag.
              </p>
              <button
                onClick={testServerError}
                disabled={loading}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Sending...' : 'Test Server Error'}
              </button>
            </div>

            {/* Error boundary test */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                Error Boundary Test
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Throw an uncaught error that should be caught by the Bugsnag error boundary.
              </p>
              <button
                onClick={testThrowError}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Throw Uncaught Error
              </button>
            </div>

            {/* Result display */}
            {result && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-900">{result}</p>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-lg bg-gray-100 p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Instructions
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
              <li>Make sure you've added your Bugsnag API key to the .env file</li>
              <li>Click any of the test buttons above</li>
              <li>Go to your Bugsnag dashboard</li>
              <li>Check the "Errors" section to see the test errors appear</li>
              <li>Verify that error details, metadata, and breadcrumbs are captured</li>
            </ol>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
