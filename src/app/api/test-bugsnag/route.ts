import { NextRequest, NextResponse } from 'next/server';
import { notifyBugsnagServer, leaveBreadcrumbServer } from '@/lib/bugsnag-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Leave a breadcrumb to track the test
    leaveBreadcrumbServer('Testing Bugsnag server error tracking', {
      endpoint: '/api/test-bugsnag',
      method: 'GET',
      timestamp: new Date().toISOString(),
    });

    // Simulate an error to test Bugsnag
    const testError = new Error('Test error from Bugsnag - Server Side');
    
    // Add custom metadata to the error
    notifyBugsnagServer(testError, {
      test: {
        purpose: 'Verify Bugsnag server-side error tracking',
        timestamp: new Date().toISOString(),
        endpoint: '/api/test-bugsnag',
      },
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test error sent to Bugsnag successfully!',
      note: 'Check your Bugsnag dashboard to see the error.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in test-bugsnag endpoint:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send test error to Bugsnag',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
