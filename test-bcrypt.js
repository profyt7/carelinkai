#!/usr/bin/env node

/**
 * CareLink AI - Bcrypt Hash Verification Test
 * 
 * This script tests if the stored password hash for family1@example.com
 * correctly matches with "password123" using bcrypt compare.
 * 
 * Usage: node test-bcrypt.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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
const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'dev-users.json');

/**
 * Main function
 */
async function main() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - Bcrypt Hash Verification Test${colors.reset}`);
  console.log(`${colors.dim}Testing if "${TEST_PASSWORD}" matches the stored hash for ${TEST_EMAIL}${colors.reset}\n`);
  
  try {
    // Load user data
    console.log(`${colors.cyan}Loading user data from:${colors.reset} ${USERS_FILE_PATH}`);
    const fileContent = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    const users = JSON.parse(fileContent);
    
    // Find the test user
    const user = users.find(u => u.email.toLowerCase() === TEST_EMAIL.toLowerCase());
    
    if (!user) {
      console.error(`${colors.red}${colors.bright}✗ User not found:${colors.reset} ${TEST_EMAIL}`);
      return;
    }
    
    // Display user info
    console.log(`\n${colors.bright}User Found:${colors.reset}`);
    console.log(`${colors.cyan}Name:${colors.reset} ${user.firstName} ${user.lastName}`);
    console.log(`${colors.cyan}Email:${colors.reset} ${user.email}`);
    console.log(`${colors.cyan}Role:${colors.reset} ${user.role}`);
    console.log(`${colors.cyan}Status:${colors.reset} ${user.status}`);
    console.log(`${colors.cyan}ID:${colors.reset} ${user.id}`);
    
    // Display hash info
    console.log(`\n${colors.bright}Password Hash Information:${colors.reset}`);
    console.log(`${colors.cyan}Stored Hash:${colors.reset} ${user.passwordHash}`);
    
    // Extract bcrypt info
    const hashParts = user.passwordHash.split('$');
    if (hashParts.length >= 3) {
      console.log(`${colors.cyan}Hash Algorithm:${colors.reset} $${hashParts[1]}$`);
      console.log(`${colors.cyan}Cost Factor:${colors.reset} ${hashParts[2]}`);
    }
    
    // Test the password
    console.log(`\n${colors.bright}Password Check:${colors.reset}`);
    console.log(`${colors.cyan}Testing Password:${colors.reset} "${TEST_PASSWORD}"`);
    
    // Compare the password with the hash
    const isMatch = await bcrypt.compare(TEST_PASSWORD, user.passwordHash);
    
    if (isMatch) {
      console.log(`${colors.green}${colors.bright}✓ SUCCESS: Password matches!${colors.reset}`);
      console.log(`${colors.green}The password "${TEST_PASSWORD}" is correct for user ${user.email}.${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}✗ FAILURE: Password does not match!${colors.reset}`);
      console.log(`${colors.red}The password "${TEST_PASSWORD}" is NOT correct for user ${user.email}.${colors.reset}`);
      
      // Generate a new hash for comparison
      console.log(`\n${colors.yellow}${colors.bright}Generating new hash for "${TEST_PASSWORD}":${colors.reset}`);
      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      console.log(`${colors.yellow}New hash:${colors.reset} ${newHash}`);
      
      // Offer to update the user's password hash
      console.log(`\n${colors.magenta}${colors.bright}Would you like to reset the password to "${TEST_PASSWORD}"? (y/n)${colors.reset}`);
      process.stdin.once('data', async (data) => {
        const response = data.toString().trim().toLowerCase();
        
        if (response === 'y' || response === 'yes') {
          // Update the user's password hash
          user.passwordHash = newHash;
          fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
          console.log(`${colors.green}${colors.bright}✓ Password hash updated successfully!${colors.reset}`);
          
          // Verify the update
          const updatedIsMatch = await bcrypt.compare(TEST_PASSWORD, newHash);
          console.log(`${colors.cyan}Verification:${colors.reset} ${updatedIsMatch ? 'Success' : 'Failed'}`);
        } else {
          console.log(`${colors.blue}Password reset cancelled.${colors.reset}`);
        }
        
        process.exit(0);
      });
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error:${colors.reset} ${error.message}`);
    console.error(error);
  }
}

// Run the main function
main().catch(error => {
  console.error(`\n${colors.red}${colors.bright}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
