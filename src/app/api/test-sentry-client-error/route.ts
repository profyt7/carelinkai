import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify Sentry client-side error tracking
 * This endpoint returns HTML that throws a client-side error
 * 
 * Usage: GET /api/test-sentry-client-error
 * 
 * Expected behavior:
 * 1. Returns HTML page with JavaScript that throws an error
 * 2. Error should be captured by Sentry client-side
 * 3. Error should appear in Sentry dashboard within a few minutes
 */
export async function GET(request: NextRequest) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentry Client-Side Test</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #2196f3;
    }
    button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin: 10px 5px;
    }
    button:hover {
      background: #1976d2;
    }
    .error-btn {
      background: #f44336;
    }
    .error-btn:hover {
      background: #d32f2f;
    }
    .success {
      background: #4caf50;
      color: white;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      display: none;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Sentry Client-Side Error Test</h1>
    
    <div class="info">
      <strong>Purpose:</strong> This page tests client-side Sentry error tracking.<br>
      <strong>What it does:</strong> Click the button below to throw an intentional error in the browser.<br>
      <strong>Expected result:</strong> The error should appear in your Sentry dashboard within a few minutes.
    </div>

    <div>
      <button onclick="throwTestError()" class="error-btn">Throw Test Error</button>
      <button onclick="captureMessage()">Send Test Message</button>
      <button onclick="goBack()">Go Back</button>
    </div>

    <div id="success" class="success"></div>

    <div class="info" style="margin-top: 30px; background: #fff3e0; border-color: #ff9800;">
      <strong>Note:</strong> Check your Sentry dashboard at:<br>
      <a href="https://sentry.io/organizations/carelinkai/issues/" target="_blank">
        https://sentry.io/organizations/carelinkai/issues/
      </a>
    </div>
  </div>

  <script>
    function showSuccess(message) {
      const successDiv = document.getElementById('success');
      successDiv.textContent = message;
      successDiv.style.display = 'block';
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 5000);
    }

    function throwTestError() {
      try {
        // Add context to the error if Sentry is available
        if (window.Sentry) {
          window.Sentry.setContext('test_context', {
            test_type: 'client-side',
            page: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          });

          window.Sentry.addBreadcrumb({
            category: 'test',
            message: 'User clicked test error button',
            level: 'info',
          });
        }

        // Throw the test error
        throw new Error('🧪 TEST ERROR: Sentry client-side monitoring test - This is an intentional error thrown in the browser to verify Sentry client integration is working correctly');
      } catch (error) {
        // Capture the error in Sentry if available
        if (window.Sentry) {
          window.Sentry.captureException(error);
          showSuccess('✅ Test error thrown and captured! Check your Sentry dashboard in a few minutes.');
        } else {
          alert('⚠️ Sentry is not loaded on this page. Check the browser console for details.');
          console.error('Sentry not available. Error was:', error);
        }
      }
    }

    function captureMessage() {
      if (window.Sentry) {
        window.Sentry.captureMessage('🧪 TEST MESSAGE: Sentry client-side test message', 'info');
        showSuccess('✅ Test message sent! Check your Sentry dashboard in a few minutes.');
      } else {
        alert('⚠️ Sentry is not loaded on this page.');
      }
    }

    function goBack() {
      window.history.back();
    }

    // Log Sentry availability on page load
    window.addEventListener('load', () => {
      if (window.Sentry) {
        console.log('✅ Sentry is loaded and ready');
        console.log('Sentry client config:', {
          initialized: typeof window.Sentry.isInitialized === 'function' ? window.Sentry.isInitialized() : 'unknown',
        });
      } else {
        console.warn('⚠️ Sentry is not loaded on this page');
      }
    });
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
