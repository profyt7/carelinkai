'use client';

import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Client-Side Sentry Test Page
 * 
 * This page is designed to test Sentry client-side error tracking
 * within a proper Next.js page context where Sentry is fully loaded.
 */
export default function TestSentryClientPage() {
  const [successMessage, setSuccessMessage] = useState('');
  const [sentryLoaded, setSentryLoaded] = useState(false);

  useEffect(() => {
    // Check if Sentry is loaded
    const isLoaded = typeof Sentry !== 'undefined' && typeof Sentry.captureException === 'function';
    setSentryLoaded(isLoaded);
    
    if (isLoaded) {
      console.log('✅ Sentry is loaded and ready');
    } else {
      console.warn('⚠️ Sentry is not loaded');
    }
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const throwTestError = () => {
    try {
      // Add context to the error
      Sentry.setContext('test_context', {
        test_type: 'client-side',
        page: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });

      Sentry.addBreadcrumb({
        category: 'test',
        message: 'User clicked test error button',
        level: 'info',
      });

      // Throw the test error
      throw new Error('🧪 TEST ERROR: Sentry client-side monitoring test - This is an intentional error thrown in the browser to verify Sentry client integration is working correctly');
    } catch (error) {
      // Capture the error in Sentry
      Sentry.captureException(error);
      showSuccess('✅ Test error thrown and captured! Check your Sentry dashboard in a few minutes.');
      
      // Also log to console for verification
      console.error('Test error captured by Sentry:', error);
    }
  };

  const captureTestMessage = () => {
    Sentry.captureMessage('🧪 TEST MESSAGE: Sentry client-side test message', 'info');
    showSuccess('✅ Test message sent! Check your Sentry dashboard in a few minutes.');
    console.log('Test message sent to Sentry');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                🧪 Sentry Client-Side Error Test
              </h1>
            </div>

            {/* Sentry Status */}
            <div className={`mb-6 p-4 rounded-lg ${sentryLoaded ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                <span className="text-2xl mr-3">{sentryLoaded ? '✅' : '❌'}</span>
                <div>
                  <p className="font-semibold text-gray-900">
                    Sentry Status: {sentryLoaded ? 'Loaded and Ready' : 'Not Loaded'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {sentryLoaded 
                      ? 'Sentry client is initialized and ready to capture errors'
                      : 'Sentry client is not available on this page'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Purpose:</p>
              <p className="text-gray-700 mb-3">
                This page tests client-side Sentry error tracking within a proper Next.js page context.
              </p>
              <p className="font-semibold text-gray-900 mb-2">What it does:</p>
              <p className="text-gray-700 mb-3">
                Click the buttons below to throw intentional errors or send test messages.
              </p>
              <p className="font-semibold text-gray-900 mb-2">Expected result:</p>
              <p className="text-gray-700">
                Errors should appear in your Sentry dashboard within a few minutes.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={throwTestError}
                disabled={!sentryLoaded}
                className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Throw Test Error
              </button>
              <button
                onClick={captureTestMessage}
                disabled={!sentryLoaded}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Send Test Message
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Dashboard Link */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Check your Sentry dashboard:</p>
              <a
                href="https://sentry.io/organizations/carelinkai/issues/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                https://sentry.io/organizations/carelinkai/issues/
              </a>
            </div>

            {/* Technical Info */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-2">Technical Info:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Page URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</li>
                <li>• Sentry SDK: @sentry/nextjs</li>
                <li>• Environment: {process.env.NODE_ENV}</li>
                <li>• Sentry Initialized: {sentryLoaded ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
