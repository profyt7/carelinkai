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

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Generate unique test run ID to prevent caching
  const testRunId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const timestamp = new Date().toISOString();
  
  console.log('[Sentry Test] ==================== SERVER TEST ====================');
  console.log('[Sentry Test] Test Run ID:', testRunId);
  console.log('[Sentry Test] Timestamp:', timestamp);
  console.log('[Sentry Test] Testing server-side Sentry configuration...');
  
  try {
    // Check if Sentry is initialized
    const isInitialized = Sentry.isInitialized();
    console.log('[Sentry Test] Sentry.isInitialized():', isInitialized);
    
    // Test 1: Capture a test message with unique ID
    console.log('[Sentry Test] Test 1: Capturing test message...');
    const messageId = Sentry.captureMessage(`🧪 Server-side Sentry test message [${testRunId}]`, 'info');
    console.log('[Sentry Test] Message captured with ID:', messageId);
    
    // Test 2: Capture a test error with unique ID
    console.log('[Sentry Test] Test 2: Capturing test error...');
    const testError = new Error(`🧪 Server-side Sentry test error [${testRunId}] - This is intentional for testing`);
    const errorId = Sentry.captureException(testError);
    console.log('[Sentry Test] Error captured with ID:', errorId);
    
    // Test 3: Add breadcrumb and capture
    console.log('[Sentry Test] Test 3: Adding breadcrumb...');
    Sentry.addBreadcrumb({
      category: 'test',
      message: `Server-side test breadcrumb [${testRunId}]`,
      level: 'info',
    });
    
    // Test 4: Capture with context
    console.log('[Sentry Test] Test 4: Capturing with context...');
    Sentry.withScope((scope) => {
      scope.setTag('test_type', 'server');
      scope.setTag('test_run_id', testRunId);
      scope.setExtra('test_data', {
        timestamp: timestamp,
        testRunId: testRunId,
        endpoint: '/api/test-sentry-server',
      });
      Sentry.captureMessage(`🧪 Server-side test with context [${testRunId}]`, 'warning');
    });
    
    console.log('[Sentry Test] All server-side tests completed!');
    console.log('[Sentry Test] ================================================================');
    
    // Flush to ensure events are sent immediately
    console.log('[Sentry Test] Flushing events to Sentry...');
    await Sentry.flush(2000);
    console.log('[Sentry Test] ✅ Events flushed to Sentry');
    
    return NextResponse.json(
      {
        success: true,
        message: 'Server-side Sentry tests completed',
        testRunId: testRunId,
        details: {
          sentryInitialized: isInitialized,
          messageId: messageId,
          errorId: errorId,
          timestamp: timestamp,
          testRunId: testRunId,
          instructions: [
            '1. Check Render logs for [Sentry Test] messages',
            '2. Check Sentry dashboard for 3 events',
            '3. Look for events with 🧪 emoji and test run ID',
            '4. Verify breadcrumbs and context are attached',
            `5. Search Sentry for: ${testRunId}`,
          ],
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Test-Run-ID': testRunId,
        },
      }
    );
    
  } catch (error) {
    console.error('[Sentry Test] Test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sentryInitialized: Sentry.isInitialized(),
        timestamp: timestamp,
        testRunId: testRunId,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
