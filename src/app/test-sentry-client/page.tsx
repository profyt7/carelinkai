/**
 * Client-side Sentry Test Page
 * 
 * This page provides UI controls to test client-side Sentry
 * 
 * Visit: /test-sentry-client
 */

'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function TestSentryClientPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Check Sentry initialization on mount
    const initialized = Sentry.isInitialized();
    setIsInitialized(initialized);
    
    addLog(`🔍 Component mounted`);
    addLog(`📊 Sentry initialized: ${initialized}`);
    addLog(`🌍 Environment: ${process.env.NODE_ENV}`);
    addLog(`🔑 NEXT_PUBLIC_SENTRY_DSN exists: ${!!process.env.NEXT_PUBLIC_SENTRY_DSN}`);
    
    console.log('[Sentry Test Client] Component mounted');
    console.log('[Sentry Test Client] Sentry initialized:', initialized);
  }, []);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  const testMessage = () => {
    addLog('🧪 Testing Sentry.captureMessage()...');
    const messageId = Sentry.captureMessage('🧪 Client-side Sentry test message', 'info');
    addLog(`✅ Message captured with ID: ${messageId}`);
    console.log('[Sentry Test Client] Message ID:', messageId);
  };
  
  const testError = () => {
    addLog('🧪 Testing Sentry.captureException()...');
    const testError = new Error('🧪 Client-side Sentry test error - This is intentional for testing');
    const errorId = Sentry.captureException(testError);
    addLog(`✅ Error captured with ID: ${errorId}`);
    console.log('[Sentry Test Client] Error ID:', errorId);
  };
  
  const testThrow = () => {
    addLog('🧪 Testing throw error (will be caught by Sentry)...');
    throw new Error('🧪 Client-side thrown error - This is intentional for testing');
  };
  
  const testWithContext = () => {
    addLog('🧪 Testing Sentry with context...');
    Sentry.withScope((scope) => {
      scope.setTag('test_type', 'client');
      scope.setExtra('test_data', {
        timestamp: new Date().toISOString(),
        page: '/test-sentry-client',
        userAgent: navigator.userAgent,
      });
      scope.addBreadcrumb({
        category: 'test',
        message: 'Client-side test breadcrumb',
        level: 'info',
      });
      const id = Sentry.captureMessage('🧪 Client-side test with context', 'warning');
      addLog(`✅ Message with context captured, ID: ${id}`);
    });
  };
  
  const testAsyncError = async () => {
    addLog('🧪 Testing async error...');
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('🧪 Client-side async error - This is intentional for testing'));
        }, 100);
      });
    } catch (error) {
      const errorId = Sentry.captureException(error);
      addLog(`✅ Async error captured with ID: ${errorId}`);
    }
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            🧪 Client-Side Sentry Test Page
          </h1>
          
          {/* Status Section */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-medium">Sentry Initialized:</span>
                <span className={isInitialized ? 'text-green-600' : 'text-red-600'}>
                  {isInitialized ? 'Yes ✅' : 'No ❌'}
                </span>
              </div>
              <div>
                <span className="font-medium">Environment:</span>
                <span className="ml-2">{process.env.NODE_ENV}</span>
              </div>
              <div>
                <span className="font-medium">NEXT_PUBLIC_SENTRY_DSN:</span>
                <span className="ml-2">
                  {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Set' : '❌ Not Set'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Warning if not initialized */}
          {!isInitialized && (
            <div className="mb-8 p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Sentry Not Initialized</h3>
              <p className="text-red-700 mb-2">
                Client-side Sentry is not initialized. This means:
              </p>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>NEXT_PUBLIC_SENTRY_DSN is not set in environment variables</li>
                <li>Or Sentry failed to initialize</li>
                <li>Events will NOT be sent to Sentry</li>
              </ul>
              <p className="text-red-700 mt-2 font-medium">
                ➡️ Set NEXT_PUBLIC_SENTRY_DSN in Render environment variables
              </p>
            </div>
          )}
          
          {/* Test Buttons */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Test Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={testMessage}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📨 Test Message
              </button>
              
              <button
                onClick={testError}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                ⚠️ Test Error
              </button>
              
              <button
                onClick={testThrow}
                className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                💥 Test Throw Error
              </button>
              
              <button
                onClick={testWithContext}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                🏷️ Test With Context
              </button>
              
              <button
                onClick={testAsyncError}
                className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium"
              >
                ⏱️ Test Async Error
              </button>
              
              <button
                onClick={clearLogs}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>
          
          {/* Logs Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Activity Log</h2>
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click a test button above.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">📋 Instructions</h3>
            <ol className="list-decimal list-inside text-yellow-800 space-y-1">
              <li>Open browser DevTools console (F12)</li>
              <li>Click test buttons above</li>
              <li>Check console for [Sentry Test Client] logs</li>
              <li>Check Sentry dashboard for events</li>
              <li>Look for events with 🧪 emoji</li>
              <li>Verify all events appear in Sentry within 1-2 minutes</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
