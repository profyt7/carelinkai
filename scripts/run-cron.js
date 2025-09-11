#!/usr/bin/env node
/**
 * CareLinkAI Cron Job Runner
 * 
 * This script invokes the reminder scheduling and processing endpoints
 * for the CareLinkAI application. It's designed to be run as a scheduled
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

// Check for missing secret
if (!CRON_SECRET) {
  console.warn('⚠️  Warning: CRON_SECRET environment variable is not set.');
  console.warn('   This may cause authentication failures if the API requires it.');
}

/**
 * Makes a POST request to a cron endpoint
 * 
 * @param {string} endpoint - The endpoint path (e.g., 'schedule' or 'process')
 * @param {object} body - The request body
 * @returns {Promise<object>} - The response data
 */
async function callCronEndpoint(endpoint, body) {
  const url = `${BASE_URL}/api/cron/reminders/${endpoint}`;
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
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      console.error(data);
      return { success: false, status: response.status, data };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Failed to call ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
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
