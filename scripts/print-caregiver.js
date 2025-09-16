#!/usr/bin/env node
/**
 * Print Caregiver Script
 * 
 * This script finds and prints login information for a caregiver user.
 * Useful for development and testing purposes.
 * 
 * Usage: node scripts/print-caregiver.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
function loadEnv() {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envPath = path.join(process.cwd(), '.env');
  
  let envContent = '';
  
  // Try .env.local first (priority)
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf-8');
    console.log('Found .env.local file');
  } 
  // Fall back to .env
  else if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('Found .env file');
  } else {
    console.warn('Warning: No .env.local or .env file found');
    return;
  }
  
  // Extract DATABASE_URL
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  if (dbUrlMatch && dbUrlMatch[1]) {
    process.env.DATABASE_URL = dbUrlMatch[1];
    console.log('DATABASE_URL loaded from environment file');
  } else {
    console.warn('Warning: DATABASE_URL not found in environment files');
  }
}

// Load environment variables
loadEnv();

// Initialize Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Find and print caregiver information
(async () => {
  try {
    console.log('Searching for caregiver users...');
    
    const caregiver = await prisma.user.findFirst({
      where: { 
        role: 'CAREGIVER' 
      },
      select: { 
        email: true, 
        firstName: true, 
        lastName: true 
      }
    });
    
    if (caregiver) {
      console.log('\n===== CAREGIVER LOGIN INFORMATION =====');
      console.log(`Email: ${caregiver.email}`);
      console.log(`Name: ${caregiver.firstName} ${caregiver.lastName}`);
      console.log('Password: Care123!');
      console.log('=======================================');
      console.log('\nUse these credentials to log in as a caregiver for testing.');
    } else {
      console.log('\n❌ No caregiver users found in the database.');
      console.log('You may need to run the seed script first:');
      console.log('npm run seed');
    }
  } catch (error) {
    console.error('Error finding caregiver user:', error);
  } finally {
    // Always disconnect from Prisma
    await prisma.$disconnect();
  }
})();
