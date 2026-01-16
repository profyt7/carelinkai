'use client';

import { useState, useEffect } from 'react';
import { notifyBugsnag, leaveBreadcrumb, isBugsnagInitialized, testBugsnagClient } from '@/lib/bugsnag-client';
import { useBugsnagStatus } from '@/components/BugsnagProvider';

export default function TestBugsnagClientPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const bugsnagStatus = useBugsnagStatus();

  useEffect(() => {
    // Get diagnostics on mount
    const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;
    setDiagnostics({
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 8) || 'none',
      nodeEnv: process.env.NODE_ENV,
      windowBugsnag: !!(window as any).Bugsnag,
      clientInitialized: isBugsnagInitialized(),
    });
  }, []);

  const testClientError = () => {
    try {
      setLoading(true);
      
      // Leave a breadcrumb
      leaveBreadcrumb('Testing Bugsnag client error tracking', {
        page: '/test-bugsnag-client',
        action: 'manual test',
      });

      // Create and notify a test error
      const testError = new Error(`Test error from Bugsnag - Client Side - ${new Date().toISOString()}`);
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
      
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`❌ Failed to test server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = () => {
    try {
      setLoading(true);
      const result = testBugsnagClient();
      setResult(`Full test result:\n${JSON.stringify(result, null, 2)}`);
      
      // Update diagnostics
      setDiagnostics((prev: any) => ({
        ...prev,
        ...result,
        lastTestAt: new Date().toISOString(),
      }));
    } catch (error) {
      setResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const checkWindowBugsnag = () => {
    const bugsnag = (window as any).Bugsnag;
    if (bugsnag) {
      setResult(`✅ window.Bugsnag is available!\nType: ${typeof bugsnag}\nKeys: ${Object.keys(bugsnag).join(', ')}`);
    } else {
      setResult('❌ window.Bugsnag is NOT available');
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

          {/* Diagnostics Panel */}
          <div className="mb-8 rounded-lg bg-gray-900 p-6 text-white">
            <h2 className="mb-4 text-xl font-semibold">Diagnostics</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">API Key Present:</span>{' '}
                <span className={diagnostics?.apiKeyPresent ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics?.apiKeyPresent ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">API Key Length:</span>{' '}
                <span className={diagnostics?.apiKeyLength >= 32 ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics?.apiKeyLength}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Client Initialized:</span>{' '}
                <span className={bugsnagStatus.initialized ? 'text-green-400' : 'text-red-400'}>
                  {bugsnagStatus.initialized ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">window.Bugsnag:</span>{' '}
                <span className={bugsnagStatus.windowBugsnag ? 'text-green-400' : 'text-red-400'}>
                  {bugsnagStatus.windowBugsnag ? 'Available' : 'Not Found'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">NODE_ENV:</span>{' '}
                <span className="text-blue-400">{diagnostics?.nodeEnv || 'unknown'}</span>
              </div>
              <div>
                <span className="text-gray-400">API Key Prefix:</span>{' '}
                <span className="text-yellow-400">{diagnostics?.apiKeyPrefix}...</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Check Bugsnag Status */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                Check Bugsnag Status
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Verify Bugsnag is available on window object.
              </p>
              <button
                onClick={checkWindowBugsnag}
                disabled={loading}
                className="mr-2 rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:bg-gray-400"
              >
                Check window.Bugsnag
              </button>
              <button
                onClick={runFullTest}
                disabled={loading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                Run Full Test
              </button>
            </div>

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
                <pre className="whitespace-pre-wrap text-sm text-blue-900">{result}</pre>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-lg bg-gray-100 p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Instructions
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
              <li>Make sure NEXT_PUBLIC_BUGSNAG_API_KEY is set in your environment variables</li>
              <li>The API key should be 32 characters long</li>
              <li>Check the diagnostics panel above to verify configuration</li>
              <li>Click any of the test buttons to send test errors</li>
              <li>Go to your Bugsnag dashboard to verify errors appear</li>
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
