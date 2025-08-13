#!/usr/bin/env node
/**
 * Create Family Record for User by Email
 * 
 * This script creates a Family record for a user if one doesn't already exist.
 * It takes an email address as a command-line argument and outputs the familyId.
 * 
 * Usage: node scripts/create-family-for-email.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get email from command line arguments
  const email = process.argv[2];
  
  if (!email) {
    console.error('Usage: node scripts/create-family-for-email.js <email>');
    process.exit(1);
  }
  
  console.log(`Looking for user with email: ${email}`);
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      family: true
    }
  });
  
  if (!user) {
    console.error(`Error: No user found with email ${email}`);
    process.exit(1);
  }
  
  console.log(`Found user: ${user.firstName} ${user.lastName} (${user.id})`);
  
  // Check if user already has a family
  if (user.family) {
    console.log(`User already has a family with ID: ${user.family.id}`);
    console.log(`familyId=${user.family.id}`);
    return user.family.id;
  }
  
  // Create family for user
  try {
    const family = await prisma.family.create({
      data: {
        userId: user.id,
        emergencyContact: `${user.firstName} ${user.lastName}`,
        emergencyPhone: '555-000-0000' // Placeholder
      }
    });
    
    console.log(`Created new family with ID: ${family.id}`);
    console.log(`familyId=${family.id}`);
    return family.id;
  } catch (error) {
    console.error('Error creating family record:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
