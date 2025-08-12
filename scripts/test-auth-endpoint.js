#!/usr/bin/env node

/**
 * CareLink AI - NextAuth Endpoint Tester
 * 
 * This script directly tests the NextAuth credentials endpoint to verify
 * authentication is working properly, bypassing the React frontend.
 * 
 * Usage: node scripts/test-auth-endpoint.js
 */

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Test credentials
const TEST_EMAIL = 'family1@example.com';
const TEST_PASSWORD = 'password123';
const BASE_URL = 'http://localhost:5000';

/**
 * Get CSRF token from NextAuth
 */
async function getCSRFToken() {
  try {
    console.log(`${colors.cyan}${colors.bright}Fetching CSRF token...${colors.reset}`);
    
    const response = await fetch(`${BASE_URL}/api/auth/csrf`);
    const data = await response.json();
    
    if (data.csrfToken) {
      console.log(`${colors.green}✓ CSRF token obtained successfully${colors.reset}`);
      return data.csrfToken;
    } else {
      console.error(`${colors.red}${colors.bright}Error: Failed to get CSRF token${colors.reset}`);
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error fetching CSRF token:${colors.reset}`, error);
    return null;
  }
}

/**
 * Test the credentials endpoint directly
 */
async function testCredentialsEndpoint(csrfToken) {
  console.log(`\n${colors.cyan}${colors.bright}Testing credentials endpoint...${colors.reset}`);
  console.log(`${colors.dim}URL: ${BASE_URL}/api/auth/callback/credentials${colors.reset}`);
  console.log(`${colors.dim}Email: ${TEST_EMAIL}${colors.reset}`);
  console.log(`${colors.dim}Password: ${'*'.repeat(TEST_PASSWORD.length)}${colors.reset}\n`);
  
  try {
    // Create request body
    const params = new URLSearchParams();
    params.append('csrfToken', csrfToken);
    params.append('email', TEST_EMAIL);
    params.append('password', TEST_PASSWORD);
    params.append('redirect', 'false');
    params.append('json', 'true');
    
    // Make the request
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `next-auth.csrf-token=${csrfToken}`
      },
      body: params,
      redirect: 'manual'
    });
    
    // Parse response
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    // Display response details
    console.log(`${colors.bright}Response Status:${colors.reset} ${response.status} ${response.statusText}`);
    console.log(`${colors.bright}Response Headers:${colors.reset}`);
    response.headers.forEach((value, name) => {
      console.log(`  ${colors.dim}${name}:${colors.reset} ${value}`);
    });
    
    console.log(`\n${colors.bright}Response Body:${colors.reset}`);
    console.log(JSON.stringify(responseData, null, 2));
    
    // Check for success or failure
    if (response.status === 200) {
      console.log(`\n${colors.green}${colors.bright}✓ Authentication successful!${colors.reset}`);
      
      if (response.headers.get('set-cookie')) {
        console.log(`${colors.green}✓ Session cookie received${colors.reset}`);
      }
      
      return true;
    } else {
      console.log(`\n${colors.red}${colors.bright}✗ Authentication failed!${colors.reset}`);
      
      // Provide more specific error information
      if (response.status === 401) {
        console.log(`${colors.yellow}Reason: Invalid credentials or user not found${colors.reset}`);
      } else if (response.status === 500) {
        console.log(`${colors.yellow}Reason: Server error - check database connection${colors.reset}`);
      }
      
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error testing credentials endpoint:${colors.reset}`, error);
    return false;
  }
}

/**
 * Test direct database connection
 */
async function testDatabaseConnection() {
  console.log(`\n${colors.cyan}${colors.bright}Testing direct database connection...${colors.reset}`);
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`${colors.dim}Connecting to database...${colors.reset}`);
    
    // Try a simple query to test connection
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (user) {
      console.log(`${colors.green}${colors.bright}✓ Database connection successful!${colors.reset}`);
      console.log(`${colors.green}✓ Found user: ${user.firstName} ${user.lastName} (${user.email})${colors.reset}`);
      await prisma.$disconnect();
      return true;
    } else {
      console.log(`${colors.red}${colors.bright}✗ User not found in database!${colors.reset}`);
      await prisma.$disconnect();
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bright}✗ Database connection failed:${colors.reset}`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - NextAuth Endpoint Tester${colors.reset}`);
  console.log(`${colors.dim}Testing authentication against ${BASE_URL}${colors.reset}\n`);
  
  // First test direct database connection
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.log(`\n${colors.yellow}${colors.bright}⚠ Database connection failed - authentication will likely fail${colors.reset}`);
    console.log(`${colors.yellow}Please check your DATABASE_URL in .env.local${colors.reset}`);
  }
  
  // Get CSRF token
  const csrfToken = await getCSRFToken();
  
  if (!csrfToken) {
    console.log(`\n${colors.red}${colors.bright}✗ Test aborted: Could not obtain CSRF token${colors.reset}`);
    return;
  }
  
  // Test credentials endpoint
  const authSuccess = await testCredentialsEndpoint(csrfToken);
  
  // Summary
  console.log(`\n${colors.cyan}${colors.bright}Test Summary:${colors.reset}`);
  console.log(`${colors.bright}Database Connection:${colors.reset} ${dbConnected ? colors.green + 'SUCCESS' : colors.red + 'FAILED'}`);
  console.log(`${colors.bright}Authentication:${colors.reset} ${authSuccess ? colors.green + 'SUCCESS' : colors.red + 'FAILED'}`);
  
  // Provide recommendations
  console.log(`\n${colors.cyan}${colors.bright}Recommendations:${colors.reset}`);
  
  if (!dbConnected) {
    console.log(`${colors.yellow}1. Verify DATABASE_URL in .env.local is correct${colors.reset}`);
    console.log(`${colors.yellow}2. Make sure PostgreSQL is running on port 5433${colors.reset}`);
    console.log(`${colors.yellow}3. Check if the postgres user has the correct password${colors.reset}`);
    console.log(`${colors.yellow}4. Try regenerating the Prisma client: npx prisma generate${colors.reset}`);
  } else if (!authSuccess) {
    console.log(`${colors.yellow}1. Verify the user ${TEST_EMAIL} exists in the database${colors.reset}`);
    console.log(`${colors.yellow}2. Check if the password hash is correct for this user${colors.reset}`);
    console.log(`${colors.yellow}3. Make sure NextAuth is properly configured${colors.reset}`);
    console.log(`${colors.yellow}4. Check server logs for more detailed error information${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ All tests passed! Authentication is working correctly.${colors.reset}`);
    console.log(`${colors.green}✓ You should now be able to log in through the web interface.${colors.reset}`);
  }
}

// Run the main function
main().catch(error => {
  console.error(`\n${colors.red}${colors.bright}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
