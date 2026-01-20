import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Send a test error to Sentry
    const testError = new Error('Sentry Server Test Error - ' + new Date().toISOString());
    
    Sentry.captureException(testError, {
      tags: {
        test: 'true',
        source: 'api-route',
        endpoint: '/api/test-sentry',
      },
    });
    
    // Also capture a message
    Sentry.captureMessage('Sentry test message from API route', {
      level: 'info',
      tags: { test: 'true' },
    });
    
    // Check if Sentry client is initialized
    const client = Sentry.getClient();
    
    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry',
      sentryInitialized: !!client,
      timestamp: new Date().toISOString(),
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'configured' : 'not configured',
    });
  } catch (error) {
    console.error('Error in test-sentry route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Test endpoint to trigger an unhandled error
export async function POST() {
  // This will trigger an unhandled error for Sentry to catch
  throw new Error('Intentional unhandled error for Sentry testing - ' + new Date().toISOString());
}
