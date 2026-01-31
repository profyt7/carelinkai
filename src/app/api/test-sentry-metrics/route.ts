/**
 * Test endpoint for Sentry Metrics
 * 
 * This endpoint demonstrates all three types of Sentry metrics:
 * - Counters: For counting discrete events
 * - Gauges: For tracking current values
 * - Distributions: For tracking value ranges
 * 
 * Access this endpoint to send test metrics to Sentry:
 * GET /api/test-sentry-metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[Sentry Metrics Test] Starting metrics test...');
    
    // Check if Sentry is properly initialized
    const client = Sentry.getClient();
    if (!client) {
      console.error('[Sentry Metrics Test] ❌ Sentry client not initialized');
      return NextResponse.json({
        success: false,
        error: 'Sentry client not initialized',
        message: 'Check that SENTRY_DSN is configured in environment variables',
      }, { status: 500 });
    }
    
    console.log('[Sentry Metrics Test] ✅ Sentry client initialized');
    
    // Get query parameters for custom attributes
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId') || `test-${Date.now()}`;
    
    // 1. COUNTER METRIC
    // Used for counting discrete events like API calls, button clicks, orders
    console.log('[Sentry Metrics Test] Sending counter metric...');
    Sentry.metrics.count('api.test.endpoint.called', 1, {
      attributes: {
        endpoint: '/api/test-sentry-metrics',
        test_id: testId,
        environment: process.env.NODE_ENV || 'development',
      },
    });
    
    Sentry.metrics.count('test.metric.counter', 1, {
      attributes: {
        type: 'test',
        category: 'demo',
      },
    });
    
    // 2. GAUGE METRIC
    // Used for tracking current values that can go up or down
    console.log('[Sentry Metrics Test] Sending gauge metric...');
    
    // Simulate active connections
    const activeConnections = Math.floor(Math.random() * 100) + 1;
    Sentry.metrics.gauge('server.active_connections', activeConnections, {
      attributes: {
        server: 'api-server',
        test_id: testId,
      },
    });
    
    // Simulate memory usage
    const memoryUsageMB = Math.floor(Math.random() * 1000) + 500;
    Sentry.metrics.gauge('server.memory_usage', memoryUsageMB, {
      unit: 'megabyte',
      attributes: {
        type: 'heap',
      },
    });
    
    // 3. DISTRIBUTION METRIC
    // Used for tracking value distributions like response times, payload sizes
    console.log('[Sentry Metrics Test] Sending distribution metric...');
    
    // Simulate API response time
    const responseTime = Math.random() * 500 + 50; // 50-550ms
    Sentry.metrics.distribution('api.response_time', responseTime, {
      unit: 'millisecond',
      attributes: {
        endpoint: '/api/test-sentry-metrics',
        method: 'GET',
        test_id: testId,
      },
    });
    
    // Simulate payload size
    const payloadSize = Math.random() * 10000 + 1000; // 1-11KB
    Sentry.metrics.distribution('api.payload_size', payloadSize, {
      unit: 'byte',
      attributes: {
        direction: 'response',
      },
    });
    
    // Track database query time
    const dbQueryTime = Math.random() * 200 + 10; // 10-210ms
    Sentry.metrics.distribution('database.query_time', dbQueryTime, {
      unit: 'millisecond',
      attributes: {
        operation: 'SELECT',
        table: 'test',
      },
    });
    
    console.log('[Sentry Metrics Test] All metrics sent, flushing...');
    
    // Flush metrics to ensure they're sent immediately
    await Sentry.flush(2000);
    
    console.log('[Sentry Metrics Test] ✅ Metrics flushed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Sentry metrics test completed successfully',
      metrics_sent: {
        counters: [
          'api.test.endpoint.called',
          'test.metric.counter',
        ],
        gauges: [
          'server.active_connections',
          'server.memory_usage',
        ],
        distributions: [
          'api.response_time',
          'api.payload_size',
          'database.query_time',
        ],
      },
      test_id: testId,
      instructions: {
        view_metrics: 'Go to Sentry Dashboard > Explore > Metrics',
        dashboard_url: 'https://the-council-labs.sentry.io/explore/metrics/',
        search_by_test_id: `Filter by test_id = ${testId}`,
      },
    });
    
  } catch (error) {
    console.error('[Sentry Metrics Test] ❌ Error during test:', error);
    
    // Capture the error in Sentry
    Sentry.captureException(error, {
      tags: {
        test: 'metrics',
        endpoint: '/api/test-sentry-metrics',
      },
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
