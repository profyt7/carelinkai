import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Test endpoint to verify Sentry server-side error tracking
 * This endpoint intentionally throws an error to test Sentry integration
 * 
 * Usage: GET /api/test-sentry-server-error
 * 
 * Expected behavior:
 * 1. Returns 500 error response
 * 2. Error should appear in Sentry dashboard within a few minutes
 * 3. Error will include context about the request
 */
export async function GET(request: NextRequest) {
  // Generate unique test run ID to prevent caching
  const testRunId = `error-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const timestamp = new Date().toISOString();
  
  console.log('[Sentry Test] ==================== SERVER ERROR TEST ====================');
  console.log('[Sentry Test] Test Run ID:', testRunId);
  console.log('[Sentry Test] Timestamp:', timestamp);
  
  try {
    // Add some context to the error
    Sentry.setContext('test_context', {
      test_type: 'server-side',
      endpoint: '/api/test-sentry-server-error',
      timestamp: timestamp,
      testRunId: testRunId,
      user_agent: request.headers.get('user-agent'),
    });

    // Add breadcrumbs for debugging
    Sentry.addBreadcrumb({
      category: 'test',
      message: `About to throw test error [${testRunId}]`,
      level: 'info',
    });

    // Capture a message first
    Sentry.captureMessage(`🧪 Sentry server-side test initiated [${testRunId}]`, 'info');

    // Throw a test error
    throw new Error(`🧪 TEST ERROR [${testRunId}]: Sentry server-side monitoring test - This is an intentional error to verify Sentry integration is working correctly`);
  } catch (error) {
    // Manually capture the error to ensure it's sent to Sentry
    Sentry.captureException(error);

    // Force Sentry to send events immediately (don't wait for buffer)
    console.log('[Sentry Test] Flushing events to Sentry...');
    await Sentry.flush(2000); // Wait up to 2 seconds for events to be sent
    console.log('[Sentry Test] ✅ Events flushed to Sentry');
    console.log('[Sentry Test] ================================================================');

    // Return error response
    return NextResponse.json(
      {
        success: false,
        message: 'Test error thrown successfully',
        testRunId: testRunId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: timestamp,
        sentryInfo: {
          note: 'This error should appear in your Sentry dashboard within a few minutes',
          checkDashboard: 'https://sentry.io/organizations/carelinkai/issues/',
          errorType: 'server-side',
          searchFor: testRunId,
        },
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Test-Run-ID': testRunId,
        },
      }
    );
  }
}
