#!/usr/bin/env node

/**
 * CareLink AI - Get User By Email
 * 
 * Looks up a user by email and prints their details as JSON.
 * 
 * Usage: 
 *   EMAIL=user@example.com node scripts/get-user-by-email.js
 *   node scripts/get-user-by-email.js user@example.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserByEmail() {
  // Get email from environment variable or command line argument
  const email = process.env.EMAIL || process.argv[2];
  
  if (!email) {
    console.error('Error: Email is required');
    console.error('Usage: EMAIL=user@example.com node scripts/get-user-by-email.js');
    console.error('   or: node scripts/get-user-by-email.js user@example.com');
    process.exit(1);
  }

  try {
    console.log(`Looking up user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    
    console.log(JSON.stringify(user, null, 2));
    return user;
  } catch (error) {
    console.error('Error looking up user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
getUserByEmail().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
