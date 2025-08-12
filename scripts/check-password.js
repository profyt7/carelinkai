#!/usr/bin/env node

/**
 * CareLink AI - Password Hash Checker
 * 
 * This script checks if a given password matches the stored hash for a specific user.
 * It's useful for debugging authentication issues.
 * 
 * Usage: node scripts/check-password.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

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

// Target email and password to check
const targetEmail = 'family1@example.com';
const testPassword = 'password123';

/**
 * Check if the password matches the stored hash
 */
async function checkPassword() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - Password Hash Checker${colors.reset}`);
  console.log(`${colors.dim}Checking password for ${targetEmail}${colors.reset}\n`);
  
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        status: true,
        role: true
      }
    });
    
    if (!user) {
      console.log(`${colors.red}${colors.bright}Error: User not found!${colors.reset}`);
      console.log(`${colors.yellow}The email "${targetEmail}" does not exist in the database.${colors.reset}`);
      return;
    }
    
    // Display user information
    console.log(`${colors.bright}User Found:${colors.reset}`);
    console.log(`${colors.cyan}Name:${colors.reset} ${user.firstName} ${user.lastName}`);
    console.log(`${colors.cyan}Email:${colors.reset} ${user.email}`);
    console.log(`${colors.cyan}Role:${colors.reset} ${user.role}`);
    console.log(`${colors.cyan}Status:${colors.reset} ${user.status}`);
    console.log(`${colors.cyan}ID:${colors.reset} ${user.id}`);
    
    // Display password hash
    console.log(`\n${colors.bright}Password Hash Information:${colors.reset}`);
    console.log(`${colors.cyan}Stored Hash:${colors.reset} ${user.passwordHash}`);
    
    // Check if the hash format is valid for bcrypt
    if (!user.passwordHash.startsWith('$2')) {
      console.log(`${colors.red}${colors.bright}Warning: Hash doesn't appear to be a valid bcrypt hash!${colors.reset}`);
      console.log(`${colors.yellow}The hash should start with "$2a$", "$2b$", or "$2y$" for bcrypt.${colors.reset}`);
    }
    
    // Analyze hash components if it's a bcrypt hash
    if (user.passwordHash.startsWith('$2')) {
      const [algorithm, cost] = user.passwordHash.split('$').filter(Boolean);
      console.log(`${colors.cyan}Hash Algorithm:${colors.reset} $${algorithm}$`);
      console.log(`${colors.cyan}Cost Factor:${colors.reset} ${cost}`);
    }
    
    // Compare password with stored hash
    console.log(`\n${colors.bright}Password Check:${colors.reset}`);
    console.log(`${colors.cyan}Testing Password:${colors.reset} "${testPassword}"`);
    
    const isMatch = await bcrypt.compare(testPassword, user.passwordHash);
    
    if (isMatch) {
      console.log(`${colors.green}${colors.bright}✓ SUCCESS: Password matches!${colors.reset}`);
      console.log(`${colors.green}The password "${testPassword}" is correct for user ${user.email}.${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}✗ FAILURE: Password does not match!${colors.reset}`);
      console.log(`${colors.red}The password "${testPassword}" is incorrect for user ${user.email}.${colors.reset}`);
      
      // Generate a new hash with the test password for comparison
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log(`\n${colors.yellow}${colors.bright}Debug Information:${colors.reset}`);
      console.log(`${colors.yellow}New hash for "${testPassword}":${colors.reset} ${newHash}`);
      console.log(`${colors.yellow}This new hash and the stored hash should be different, but both should validate the same password.${colors.reset}`);
    }
    
    // Try to manually update the password for testing
    console.log(`\n${colors.magenta}${colors.bright}Would you like to reset the password to "${testPassword}"? (y/n)${colors.reset}`);
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();
      
      if (answer === 'y' || answer === 'yes') {
        try {
          // Generate new hash
          const newHash = await bcrypt.hash(testPassword, 10);
          
          // Update user password
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
          });
          
          console.log(`${colors.green}${colors.bright}✓ Password has been reset successfully!${colors.reset}`);
          console.log(`${colors.green}You can now try logging in with ${user.email} and password "${testPassword}"${colors.reset}`);
        } catch (error) {
          console.log(`${colors.red}${colors.bright}✗ Failed to reset password:${colors.reset}`, error);
        } finally {
          await prisma.$disconnect();
          process.exit(0);
        }
      } else {
        console.log(`${colors.blue}Password reset cancelled.${colors.reset}`);
        await prisma.$disconnect();
        process.exit(0);
      }
    });
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Error checking password:${colors.reset}`, error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the function
checkPassword().catch(e => {
  console.error(`\n${colors.red}${colors.bright}Unhandled error:${colors.reset}`, e);
  process.exit(1);
});
