import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('='.repeat(60));
  console.log('[Test Sentry API] === STARTING DIAGNOSTICS ===');
  console.log('[Test Sentry API] Timestamp:', new Date().toISOString());
  
  // Gather detailed environment info
  const envInfo = {
    SENTRY_DSN: process.env.SENTRY_DSN ? `SET (${process.env.SENTRY_DSN.substring(0, 40)}...)` : 'NOT SET',
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ? `SET (${process.env.NEXT_PUBLIC_SENTRY_DSN.substring(0, 40)}...)` : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME || 'not set',
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || 'not set',
    HOSTNAME: process.env.HOSTNAME || 'not set',
  };
  
  console.log('[Test Sentry API] Environment check:');
  Object.entries(envInfo).forEach(([key, value]) => {
    console.log(`[Test Sentry API]   ${key}: ${value}`);
  });
  
  try {
    // Check if Sentry client is initialized
    console.log('[Test Sentry API] Checking Sentry.getClient()...');
    const client = Sentry.getClient();
    console.log('[Test Sentry API] Sentry client exists:', !!client);
    
    let dsnInfo = 'NOT AVAILABLE - client may not be initialized';
    let clientOptions: Record<string, unknown> | null = null;
    let diagnostics: Record<string, unknown> = {};
    
    if (client) {
      console.log('[Test Sentry API] Client found! Getting details...');
      
      const dsn = client.getDsn();
      console.log('[Test Sentry API] DSN object exists:', !!dsn);
      
      if (dsn) {
        dsnInfo = `${dsn.protocol}://${dsn.publicKey?.substring(0, 8)}...@${dsn.host}/${dsn.projectId}`;
        console.log('[Test Sentry API] DSN formatted:', dsnInfo);
      }
      
      const options = client.getOptions();
      clientOptions = {
        environment: options.environment,
        release: options.release,
        debug: options.debug,
        tracesSampleRate: options.tracesSampleRate,
        dsn: options.dsn ? 'configured' : 'not configured',
      };
      console.log('[Test Sentry API] Client options:', JSON.stringify(clientOptions, null, 2));
      
      diagnostics = {
        clientType: client.constructor.name,
        hasTransport: !!(client as unknown as { _transport?: unknown })._transport,
        integrations: Object.keys((client as unknown as { _integrations?: Record<string, unknown> })._integrations || {}),
      };
      console.log('[Test Sentry API] Diagnostics:', JSON.stringify(diagnostics, null, 2));
    } else {
      console.log('[Test Sentry API] ❌ NO CLIENT! Server-side Sentry not initialized');
      console.log('[Test Sentry API] This means either:');
      console.log('[Test Sentry API]   1. instrumentation.ts was not loaded');
      console.log('[Test Sentry API]   2. sentry.server.config.ts failed');
      console.log('[Test Sentry API]   3. DSN environment variables are missing');
    }
    
    // Attempt to send test error regardless
    console.log('[Test Sentry API] Attempting to capture test error...');
    const testError = new Error('Sentry Server Test Error - ' + new Date().toISOString());
    
    const eventId = Sentry.captureException(testError, {
      tags: {
        test: 'true',
        source: 'api-route',
        endpoint: '/api/test-sentry',
        clientExists: String(!!client),
      },
    });
    
    console.log('[Test Sentry API] captureException returned eventId:', eventId);
    console.log('[Test Sentry API] eventId type:', typeof eventId);
    console.log('[Test Sentry API] eventId is empty:', !eventId);
    
    // Also capture a message
    const messageId = Sentry.captureMessage('Sentry test message from API route - ' + new Date().toISOString(), {
      level: 'warning',
      tags: { test: 'true', clientExists: String(!!client) },
    });
    
    console.log('[Test Sentry API] captureMessage returned messageId:', messageId);
    
    // Flush to ensure events are sent
    console.log('[Test Sentry API] Calling Sentry.flush(5000)...');
    const flushResult = await Sentry.flush(5000);
    console.log('[Test Sentry API] Flush result:', flushResult);
    
    const response = {
      success: !!client,
      message: client ? 'Sentry client is initialized and test error sent' : 'Sentry client NOT found - check server logs',
      sentryInitialized: !!client,
      clientDsn: dsnInfo,
      clientOptions,
      diagnostics,
      eventIds: {
        exception: eventId || 'no event ID returned',
        message: messageId || 'no message ID returned',
      },
      flushResult,
      environment: envInfo,
      timestamp: new Date().toISOString(),
      troubleshooting: !client ? {
        checkLogs: 'Look for [INSTRUMENTATION FILE] and [SENTRY SERVER CONFIG] in Render logs',
        possibleIssues: [
          'SENTRY_DSN not set in Render environment',
          'instrumentationHook not enabled in next.config.js',
          'instrumentation.ts not in project root',
        ],
      } : undefined,
    };
    
    console.log('[Test Sentry API] === DIAGNOSTICS COMPLETE ===');
    console.log('='.repeat(60));
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Test Sentry API] ❌ EXCEPTION:', error);
    console.error('[Test Sentry API] Stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
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
