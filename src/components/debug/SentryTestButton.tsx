/**
 * Sentry Test Button Component
 * 
 * A floating button for quickly testing Sentry integration
 * Only shown in development or for admin users
 * 
 * Usage: Add to any page or layout
 * <SentryTestButton />
 */

'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryTestButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');
  
  // Only show in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SHOW_DEBUG_TOOLS) {
    return null;
  }
  
  const testSentry = (type: 'message' | 'error' | 'server' | 'edge' | 'client') => {
    try {
      switch (type) {
        case 'message':
          const msgId = Sentry.captureMessage('🧪 Quick test message from SentryTestButton', 'info');
          setLastResult(`✅ Message sent (ID: ${msgId})`);
          break;
          
        case 'error':
          const error = new Error('🧪 Quick test error from SentryTestButton');
          const errId = Sentry.captureException(error);
          setLastResult(`✅ Error sent (ID: ${errId})`);
          break;
          
        case 'server':
          fetch('/api/test-sentry-server')
            .then(res => res.json())
            .then(data => setLastResult('✅ Server test completed'))
            .catch(err => setLastResult('❌ Server test failed'));
          break;
          
        case 'edge':
          fetch('/api/test-sentry-edge')
            .then(res => res.json())
            .then(data => setLastResult('✅ Edge test completed'))
            .catch(err => setLastResult('❌ Edge test failed'));
          break;
          
        case 'client':
          window.open('/test-sentry-client', '_blank');
          setLastResult('✅ Opened client test page');
          break;
      }
    } catch (err) {
      setLastResult('❌ Test failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };
  
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 flex items-center justify-center text-2xl"
        title="Sentry Debug Tools"
      >
        🧪
      </button>
      
      {/* Popup Menu */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">🧪 Sentry Debug</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2 mb-4">
            <button
              onClick={() => testSentry('message')}
              className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
            >
              📨 Test Message
            </button>
            
            <button
              onClick={() => testSentry('error')}
              className="w-full px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
            >
              ⚠️ Test Error
            </button>
            
            <button
              onClick={() => testSentry('server')}
              className="w-full px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium"
            >
              🖥️ Test Server API
            </button>
            
            <button
              onClick={() => testSentry('edge')}
              className="w-full px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm font-medium"
            >
              ⚡ Test Edge API
            </button>
            
            <button
              onClick={() => testSentry('client')}
              className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-medium"
            >
              🌐 Open Full Test Page
            </button>
          </div>
          
          {lastResult && (
            <div className="p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 break-words">
              {lastResult}
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            <div className="font-medium mb-1">Status:</div>
            <div>Initialized: {Sentry.isInitialized() ? '✅' : '❌'}</div>
            <div>Env: {process.env.NODE_ENV}</div>
          </div>
        </div>
      )}
    </>
  );
}
