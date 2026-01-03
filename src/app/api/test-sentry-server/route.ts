/**
 * Test endpoint for server-side Sentry
 * 
 * This endpoint tests:
 * 1. Server-side Sentry initialization
 * 2. Error capture
 * 3. Message capture
 * 
 * Visit: /api/test-sentry-server
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  console.log('[Sentry Test] ==================== SERVER TEST ====================');
  console.log('[Sentry Test] Testing server-side Sentry configuration...');
  
  try {
    // Check if Sentry is initialized
    const isInitialized = Sentry.isInitialized();
    console.log('[Sentry Test] Sentry.isInitialized():', isInitialized);
    
    // Test 1: Capture a test message
    console.log('[Sentry Test] Test 1: Capturing test message...');
    const messageId = Sentry.captureMessage('🧪 Server-side Sentry test message', 'info');
    console.log('[Sentry Test] Message captured with ID:', messageId);
    
    // Test 2: Capture a test error
    console.log('[Sentry Test] Test 2: Capturing test error...');
    const testError = new Error('🧪 Server-side Sentry test error - This is intentional for testing');
    const errorId = Sentry.captureException(testError);
    console.log('[Sentry Test] Error captured with ID:', errorId);
    
    // Test 3: Add breadcrumb and capture
    console.log('[Sentry Test] Test 3: Adding breadcrumb...');
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'Server-side test breadcrumb',
      level: 'info',
    });
    
    // Test 4: Capture with context
    console.log('[Sentry Test] Test 4: Capturing with context...');
    Sentry.withScope((scope) => {
      scope.setTag('test_type', 'server');
      scope.setExtra('test_data', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/test-sentry-server',
      });
      Sentry.captureMessage('🧪 Server-side test with context', 'warning');
    });
    
    console.log('[Sentry Test] All server-side tests completed!');
    console.log('[Sentry Test] ================================================================');
    
    // Flush to ensure events are sent immediately
    await Sentry.flush(2000);
    console.log('[Sentry Test] Events flushed to Sentry');
    
    return NextResponse.json({
      success: true,
      message: 'Server-side Sentry tests completed',
      details: {
        sentryInitialized: isInitialized,
        messageId: messageId,
        errorId: errorId,
        timestamp: new Date().toISOString(),
        instructions: [
          '1. Check Render logs for [Sentry Test] messages',
          '2. Check Sentry dashboard for 3 events',
          '3. Look for events with 🧪 emoji',
          '4. Verify breadcrumbs and context are attached',
        ],
      },
    });
    
  } catch (error) {
    console.error('[Sentry Test] Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sentryInitialized: Sentry.isInitialized(),
    }, { status: 500 });
  }
}
