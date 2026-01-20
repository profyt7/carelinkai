import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[Test Sentry API] Starting diagnostics...');
  
  // Gather environment info
  const envInfo = {
    SENTRY_DSN: process.env.SENTRY_DSN ? 'configured' : 'not set',
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'configured' : 'not set',
    NODE_ENV: process.env.NODE_ENV,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
  };
  
  console.log('[Test Sentry API] Environment:', envInfo);
  
  try {
    // Check if Sentry client is initialized
    const client = Sentry.getClient();
    console.log('[Test Sentry API] Sentry client:', !!client);
    
    let dsnInfo = 'not available';
    let clientOptions = null;
    
    if (client) {
      const dsn = client.getDsn();
      if (dsn) {
        dsnInfo = `${dsn.protocol}://${dsn.publicKey?.substring(0, 8)}...@${dsn.host}/${dsn.projectId}`;
      }
      clientOptions = {
        environment: client.getOptions().environment,
        release: client.getOptions().release,
        debug: client.getOptions().debug,
      };
    }
    
    // Send a test error to Sentry
    const testError = new Error('Sentry Server Test Error - ' + new Date().toISOString());
    
    const eventId = Sentry.captureException(testError, {
      tags: {
        test: 'true',
        source: 'api-route',
        endpoint: '/api/test-sentry',
      },
    });
    
    console.log('[Test Sentry API] Captured exception with event ID:', eventId);
    
    // Also capture a message
    const messageId = Sentry.captureMessage('Sentry test message from API route', {
      level: 'info',
      tags: { test: 'true' },
    });
    
    console.log('[Test Sentry API] Captured message with event ID:', messageId);
    
    // Flush to ensure events are sent
    await Sentry.flush(2000);
    console.log('[Test Sentry API] Flushed Sentry events');
    
    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry',
      sentryInitialized: !!client,
      clientDsn: dsnInfo,
      clientOptions,
      eventIds: {
        exception: eventId,
        message: messageId,
      },
      environment: envInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Test Sentry API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: envInfo,
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
