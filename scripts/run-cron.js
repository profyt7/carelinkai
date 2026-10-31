#!/usr/bin/env node
/**
 * CareLinkAI Cron Job Runner
 * 
 * This script invokes the reminder scheduling and processing endpoints
 * for the CareLinkAI application, plus the Family Concierge order sweep (OL-248). It's designed to be run as a scheduled
 * task (e.g., via cron, systemd timer, or cloud scheduler).
 * 
 * Usage:
 *   node scripts/run-cron.js
 * 
 * Environment variables:
 *   NEXT_PUBLIC_APP_URL - Base URL of the application (default: http://localhost:5000)
 *   CRON_SECRET - Secret key for authenticating cron requests
 *   CRON_WINDOW_MINUTES - Window for scheduling reminders (default: 1440 = 24 hours)
 *   CRON_MAX_PER_RUN - Maximum notifications to process per run (default: 100)
 */

// Read environment variables with defaults
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
const CRON_SECRET = process.env.CRON_SECRET;
const WINDOW_MINUTES = parseInt(process.env.CRON_WINDOW_MINUTES || '1440', 10);
const MAX_PER_RUN = parseInt(process.env.CRON_MAX_PER_RUN || '100', 10);

// Check for missing secret (the value itself is never printed)
if (!CRON_SECRET) {
  console.warn('⚠️  Warning: CRON_SECRET environment variable is not set.');
  console.warn('   Every call will fail with "auth 401 — CRON_SECRET mismatch" (the endpoints fail closed).');
}

/**
 * Makes a POST request to a cron endpoint
 * 
 * @param {string} endpoint - The endpoint path (e.g., 'schedule' or 'process')
 * @param {object} body - The request body
 * @returns {Promise<object>} - The response data
 */
async function callCronEndpoint(endpoint, body, path = `/api/cron/reminders/${endpoint}`) {
  const url = `${BASE_URL}${path}`;
  console.log(`📡 Calling ${url}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add secret header if available
    if (CRON_SECRET) {
      headers['x-cron-secret'] = CRON_SECRET;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // OL-160: always print the HTTP status + response body (never the secret),
    // and name the cause: auth 401 — CRON_SECRET mismatch vs 5xx — app error.
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 2000) }; }
    console.log(`   HTTP ${response.status} ${response.statusText}`);
    console.log(`   Body: ${text.slice(0, 2000)}`);

    if (!response.ok) {
      const { message } = classifyCronFailure(response.status);
      console.error(`❌ ${endpoint}: ${message}`);
      return { success: false, status: response.status, data, message };
    }

    return { success: true, data };
  } catch (error) {
    const { message } = classifyCronFailure(0);
    console.error(`❌ Failed to call ${endpoint}: ${message} (${error.message})`);
    return { success: false, status: 0, error: error.message, message };
  }
}

/**
 * Same table as classifyCronFailure() in src/lib/cron-auth.ts (kept inline so
 * this script runs with plain `node`, no build step).
 */
function classifyCronFailure(status) {
  if (status >= 200 && status < 300) return { kind: 'ok', message: 'ok' };
  if (status === 401 || status === 403) return { kind: 'auth', message: 'auth 401 — CRON_SECRET mismatch (or not set on the server)' };
  if (status >= 500) return { kind: 'app_error', message: `${status} — app error (5xx); see the response body / Sentry` };
  if (status === 0) return { kind: 'unreachable', message: 'no HTTP response — host unreachable or DNS/TLS failure' };
  return { kind: 'client_error', message: `${status} — client error (4xx); check the URL and method` };
}

/**
 * Main function to run all cron tasks
 */
async function runCronTasks() {
  let hasError = false;
  
  // Step 1: Schedule upcoming reminders
  console.log(`\n🔔 Scheduling reminders (window: ${WINDOW_MINUTES} minutes)...`);
  const scheduleResult = await callCronEndpoint('schedule', { windowMinutes: WINDOW_MINUTES });
  
  if (scheduleResult.success) {
    const { scheduled, scanned, skippedExisting, durationMs } = scheduleResult.data;
    console.log(`✅ Scheduled ${scheduled} reminders (scanned ${scanned} appointments, skipped ${skippedExisting} existing) in ${durationMs}ms`);
  } else {
    hasError = true;
  }
  
  // Step 2: Process due notifications
  console.log(`\n📨 Processing due notifications (max: ${MAX_PER_RUN})...`);
  const processResult = await callCronEndpoint('process', { maxPerRun: MAX_PER_RUN });
  
  if (processResult.success) {
    const { processed, sent, failed, durationMs } = processResult.data;
    console.log(`✅ Processed ${processed} notifications (sent: ${sent}, failed: ${failed}) in ${durationMs}ms`);
  } else {
    hasError = true;
  }
  
  // Step 3 (OL-248): Family Concierge pay-when-ready sweep — one payment reminder at 3 days, expiry at 14.
  console.log(`\n💳 Concierge orders sweep...`);
  const conciergeResult = await callCronEndpoint('concierge-orders', {}, '/api/cron/concierge-orders');
  if (conciergeResult.success) {
    const { reminded, expired, durationMs } = conciergeResult.data;
    console.log(`✅ Concierge sweep: ${reminded} reminder(s), ${expired} expired in ${durationMs}ms`);
  } else {
    hasError = true;
  }

  // Exit with appropriate code
  if (hasError) {
    console.error('\n❌ Cron job completed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Cron job completed successfully');
    process.exit(0);
  }
}

// Run the script
runCronTasks().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
