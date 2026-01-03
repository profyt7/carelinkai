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
  try {
    // Add some context to the error
    Sentry.setContext('test_context', {
      test_type: 'server-side',
      endpoint: '/api/test-sentry-server-error',
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get('user-agent'),
    });

    // Add breadcrumbs for debugging
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'About to throw test error',
      level: 'info',
    });

    // Capture a message first
    Sentry.captureMessage('Sentry server-side test initiated', 'info');

    // Throw a test error
    throw new Error('🧪 TEST ERROR: Sentry server-side monitoring test - This is an intentional error to verify Sentry integration is working correctly');
  } catch (error) {
    // Manually capture the error to ensure it's sent to Sentry
    Sentry.captureException(error);

    // Force Sentry to send events immediately (don't wait for buffer)
    await Sentry.flush(2000); // Wait up to 2 seconds for events to be sent

    // Return error response
    return NextResponse.json(
      {
        success: false,
        message: 'Test error thrown successfully',
        error: error instanceof Error ? error.message : 'Unknown error',
        sentryInfo: {
          note: 'This error should appear in your Sentry dashboard within a few minutes',
          checkDashboard: 'https://sentry.io/organizations/carelinkai/issues/',
          errorType: 'server-side',
        },
      },
      { status: 500 }
    );
  }
}
