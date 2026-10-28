/**
 * Test script to verify Sentry Logs are working
 * 
 * Run this script after deploying the application to test if logs are being sent to Sentry.
 * 
 * Usage:
 * 1. Make sure the application is running (npm run dev or deployed)
 * 2. Add this code to any API route or page component
 * 3. Trigger the route/page
 * 4. Check the Sentry dashboard at: https://the-council-labs.sentry.io/explore/logs/
 */

import * as Sentry from '@sentry/nextjs';

export function testSentryLogs() {
  console.log('Testing Sentry Logs...');

  // Test different log levels
  Sentry.logger.trace('Trace level log - detailed debugging information', { 
    test: true, 
    timestamp: new Date().toISOString() 
  });

  Sentry.logger.debug('Debug level log - debugging information', { 
    test: true, 
    feature: 'sentry-logs-test' 
  });

  Sentry.logger.info('Info level log - general information', { 
    test: true, 
    message: 'Sentry Logs are enabled!' 
  });

  Sentry.logger.warn('Warning level log - warning message', { 
    test: true, 
    warning: 'This is a test warning' 
  });

  Sentry.logger.error('Error level log - error message', { 
    test: true, 
    error: 'This is a test error' 
  });

  console.log('✅ Test logs sent to Sentry. Check the dashboard at: https://the-council-labs.sentry.io/explore/logs/');
}

// Example usage in an API route:
// export async function GET() {
//   testSentryLogs();
//   return Response.json({ message: 'Sentry logs test completed' });
// }

// Example usage in a page component:
// export default function TestPage() {
//   useEffect(() => {
//     testSentryLogs();
//   }, []);
//   return <div>Check Sentry dashboard for logs</div>;
// }
