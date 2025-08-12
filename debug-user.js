/**
 * Debug User Verification Token Script
 * 
 * This script checks if a user's verification token was properly set in the database.
 * Run with: node debug-user.js [email]
 * 
 * Example: node debug-user.js debug_test@example.com
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkUserVerificationToken() {
  try {
    // Get email from command line arguments or use default
    const email = process.argv[2] || 'debug_test@example.com';
    
    console.log(`🔍 Looking up user with email: ${email}`);
    
    // Query the database for the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        verificationToken: true,
        verificationTokenExpiry: true,
        createdAt: true
      }
    });
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      return;
    }
    
    console.log('\n📋 User Information:');
    console.log('--------------------------------------------------');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Status: ${user.status}`);
    console.log(`Created At: ${user.createdAt}`);
    console.log(`Email Verified: ${user.emailVerified || 'Not verified'}`);
    
    console.log('\n🔑 Verification Token Information:');
    console.log('--------------------------------------------------');
    
    if (user.verificationToken) {
      console.log(`Token: ${user.verificationToken}`);
      console.log(`Expiry: ${user.verificationTokenExpiry}`);
      
      // Check if token is expired
      const now = new Date();
      const isExpired = user.verificationTokenExpiry < now;
      console.log(`Token Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      
      // Calculate time remaining until expiry
      if (!isExpired) {
        const timeRemaining = user.verificationTokenExpiry - now;
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Time Remaining: ${hoursRemaining}h ${minutesRemaining}m`);
      }
      
      // Generate verification URL for testing
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5002';
      const verificationUrl = `${baseUrl}/auth/verify?token=${user.verificationToken}`;
      console.log('\n🔗 Verification URL for testing:');
      console.log(verificationUrl);
    } else {
      console.log('❌ No verification token found for this user.');
      console.log('Possible reasons:');
      console.log('1. Token was not generated during registration');
      console.log('2. User has already verified their email');
      console.log('3. Token was manually cleared');
    }
    
  } catch (error) {
    console.error('Error checking user verification token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkUserVerificationToken();
