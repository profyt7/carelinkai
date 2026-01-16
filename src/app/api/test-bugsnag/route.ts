import { NextRequest, NextResponse } from 'next/server';
import { 
  notifyBugsnagServer, 
  leaveBreadcrumbServer, 
  isBugsnagServerInitialized,
  testBugsnagServer 
} from '@/lib/bugsnag-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;
    const releaseStage = process.env.NEXT_PUBLIC_BUGSNAG_RELEASE_STAGE || process.env.NODE_ENV;
    
    // Diagnostic info
    const diagnostics = {
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 8) || 'none',
      nodeEnv: process.env.NODE_ENV,
      releaseStage,
      serverInitialized: isBugsnagServerInitialized(),
      timestamp: new Date().toISOString(),
    };
    
    console.log('[test-bugsnag] Diagnostics:', diagnostics);

    if (!isBugsnagServerInitialized()) {
      return NextResponse.json({
        success: false,
        message: 'Bugsnag server is NOT initialized',
        diagnostics,
        suggestion: 'Check that NEXT_PUBLIC_BUGSNAG_API_KEY is set correctly in environment variables',
      }, { status: 500 });
    }

    // Leave a breadcrumb to track the test
    leaveBreadcrumbServer('Testing Bugsnag server error tracking', {
      endpoint: '/api/test-bugsnag',
      method: 'GET',
      timestamp: new Date().toISOString(),
    });

    // Simulate an error to test Bugsnag
    const testError = new Error(`Test error from Bugsnag - Server Side - ${new Date().toISOString()}`);
    
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
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        releaseStage,
      },
    });

    // Run full test
    const testResult = testBugsnagServer();

    return NextResponse.json({
      success: true,
      message: 'Test error sent to Bugsnag successfully!',
      note: 'Check your Bugsnag dashboard to see the error.',
      diagnostics,
      testResult,
    });
  } catch (error) {
    console.error('[test-bugsnag] Error in endpoint:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send test error to Bugsnag',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// POST method to test with custom error message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customMessage = body.message || 'Custom test error from POST request';
    
    if (!isBugsnagServerInitialized()) {
      return NextResponse.json({
        success: false,
        message: 'Bugsnag server is NOT initialized',
        serverInitialized: false,
      }, { status: 500 });
    }

    const testError = new Error(customMessage);
    
    notifyBugsnagServer(testError, {
      test: {
        purpose: 'Custom test error via POST',
        timestamp: new Date().toISOString(),
        customMessage,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Custom test error sent to Bugsnag',
      customMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
