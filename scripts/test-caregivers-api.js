#!/usr/bin/env node
/**
 * Test script for caregivers API
 * Run: node scripts/test-caregivers-api.js
 */

const https = require('https');

// Configuration
const BASE_URL = 'https://carelinkai.onrender.com';
const API_PATH = '/api/operator/caregivers';

// Test with your session cookie from browser
const SESSION_COOKIE = process.env.SESSION_COOKIE || '';

if (!SESSION_COOKIE) {
  console.error('❌ ERROR: SESSION_COOKIE environment variable not set!');
  console.error('\nHow to get your session cookie:');
  console.error('1. Login to https://carelinkai.onrender.com');
  console.error('2. Open DevTools (F12) → Application tab');
  console.error('3. Under "Cookies", find: __Secure-next-auth.session-token');
  console.error('4. Copy the full cookie value');
  console.error('5. Run: SESSION_COOKIE="your-cookie-value" node scripts/test-caregivers-api.js\n');
  process.exit(1);
}

console.log('🔍 Testing Caregivers API...\n');
console.log(`URL: ${BASE_URL}${API_PATH}`);
console.log(`Cookie length: ${SESSION_COOKIE.length} chars\n`);

const options = {
  hostname: 'carelinkai.onrender.com',
  port: 443,
  path: API_PATH,
  method: 'GET',
  headers: {
    'Cookie': `__Secure-next-auth.session-token=${SESSION_COOKIE}`,
    'Accept': 'application/json',
    'User-Agent': 'CareLinkAI-Test-Script/1.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('\n📦 Response Body:\n');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (res.statusCode === 200) {
        console.log('\n✅ SUCCESS! API returned caregivers.');
        console.log(`Found ${json.caregivers?.length || 0} caregivers.`);
      } else if (res.statusCode === 401) {
        console.log('\n⚠️ AUTHENTICATION ERROR');
        console.log('Your session cookie may have expired. Please get a fresh one.');
      } else if (res.statusCode === 500) {
        console.log('\n❌ SERVER ERROR');
        console.log('Error details:', json.details || 'No details provided');
        console.log('Error type:', json.type || 'Unknown');
        console.log('\n🔍 This is the actual error we need to fix!');
      } else {
        console.log(`\n⚠️ Unexpected status: ${res.statusCode}`);
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ Failed to parse JSON response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e);
});

req.setTimeout(30000, () => {
  console.error('❌ Request timeout (30s)');
  req.destroy();
});

req.end();

console.log('⏳ Waiting for response...\n');
