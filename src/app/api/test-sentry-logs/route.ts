/**
 * API Route to test Sentry Logs
 * 
 * Visit: http://localhost:3000/api/test-sentry-logs
 * 
 * This will send test logs to Sentry at different log levels.
 * Check the Sentry dashboard at: https://the-council-labs.sentry.io/explore/logs/
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    console.log('[Test Sentry Logs] Starting test...');

    // Test different log levels
    Sentry.logger.trace('Trace level log - detailed debugging information', { 
      test: true, 
      timestamp: new Date().toISOString(),
      level: 'trace'
    });

    Sentry.logger.debug('Debug level log - debugging information', { 
      test: true, 
      feature: 'sentry-logs-test',
      level: 'debug'
    });

    Sentry.logger.info('Info level log - Sentry Logs are working!', { 
      test: true, 
      message: 'Sentry Logs feature enabled successfully',
      level: 'info'
    });

    Sentry.logger.warn('Warning level log - test warning', { 
      test: true, 
      warning: 'This is a test warning',
      level: 'warn'
    });

    Sentry.logger.error('Error level log - test error', { 
      test: true, 
      error: 'This is a test error (not a real error)',
      level: 'error'
    });

    console.log('[Test Sentry Logs] ✅ Test logs sent to Sentry');

    return NextResponse.json({
      success: true,
      message: 'Sentry logs test completed successfully',
      instructions: 'Check the Sentry dashboard at: https://the-council-labs.sentry.io/explore/logs/',
      logsSent: [
        'trace - detailed debugging information',
        'debug - debugging information',
        'info - Sentry Logs are working!',
        'warn - test warning',
        'error - test error'
      ]
    });
  } catch (error) {
    console.error('[Test Sentry Logs] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
