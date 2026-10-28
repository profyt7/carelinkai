/**
 * Get Verification Token Script
 * 
 * This script retrieves the verification token for a user by email address,
 * making it easy to test the verification endpoint.
 * 
 * Usage: node get-token.js <email>
 * Example: node get-token.js test@example.com
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function getVerificationToken() {
  try {
    // Get email from command line args or use default
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Error: Email address required');
      console.error('Usage: node get-token.js <email>');
      process.exit(1);
    }
    
    console.log(`🔍 Looking up verification token for: ${email}`);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        verificationToken: true,
        verificationTokenExpiry: true
      }
    });
    
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }
    
    if (!user.verificationToken) {
      console.error(`❌ No verification token found for user: ${email}`);
      console.error('The user may already be verified or no token has been generated');
      process.exit(1);
    }
    
    // Calculate expiration time
    const now = new Date();
    const expiry = new Date(user.verificationTokenExpiry);
    const isExpired = expiry < now;
    const hoursRemaining = isExpired ? 0 : Math.floor((expiry - now) / (1000 * 60 * 60));
    const minutesRemaining = isExpired ? 0 : Math.floor(((expiry - now) % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log('\n✅ Verification token found!');
    console.log('--------------------------------------------------');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Token Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
    
    if (!isExpired) {
      console.log(`Expires in: ${hoursRemaining}h ${minutesRemaining}m`);
    }
    
    // Generate verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5002';
    const verifyUrl = `${baseUrl}/auth/verify?token=${user.verificationToken}`;
    
    console.log('\n📋 TOKEN AND TEST COMMANDS');
    console.log('--------------------------------------------------');
    console.log('Token:');
    console.log(user.verificationToken);
    console.log('\nVerification URL:');
    console.log(verifyUrl);
    console.log('\nCURL Command:');
    console.log(`curl -X POST ${baseUrl}/api/auth/verify -H "Content-Type: application/json" -d '{"token":"${user.verificationToken}"}'`);
    console.log('\nPowerShell Command:');
    console.log(`$body = @{ token = '${user.verificationToken}' } | ConvertTo-Json`);
    console.log(`Invoke-RestMethod -Uri "${baseUrl}/api/auth/verify" -Method POST -ContentType "application/json" -Body $body`);
    
  } catch (error) {
    console.error('❌ Error retrieving verification token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
getVerificationToken();
