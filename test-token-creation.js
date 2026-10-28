/**
 * Token Creation Test Script
 * 
 * This script directly tests the verification token creation functionality
 * to debug why tokens aren't being properly saved in the database.
 * 
 * Usage: 
 *   node test-token-creation.js <email>
 * 
 * Example:
 *   node test-token-creation.js test@example.com
 */

const { PrismaClient, UserStatus } = require('@prisma/client');
const { randomBytes } = require('crypto');

// Constants
const TOKEN_EXPIRY_HOURS = 24;

// Initialize Prisma client
const prisma = new PrismaClient({
  // Enable query logging to see what's happening
  log: ['query', 'info', 'warn', 'error'],
});

/**
 * Create a verification token for a user
 */
async function createVerificationToken(userId) {
  console.log(`\n📝 Creating verification token for user ID: ${userId}`);
  
  try {
    // Generate random token
    const token = randomBytes(32).toString('hex');
    console.log(`Generated token: ${token}`);
    
    // Set expiration time
    const expires = new Date();
    expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);
    console.log(`Token will expire at: ${expires.toISOString()}`);
    
    // Update user record with token
    console.log('Updating user record in database...');
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationTokenExpiry: expires,
      },
      select: {
        id: true,
        email: true,
        verificationToken: true,
        verificationTokenExpiry: true,
      }
    });
    
    console.log('✅ Token created and saved successfully!');
    console.log('Updated user:', JSON.stringify(updatedUser, null, 2));
    
    return token;
  } catch (error) {
    console.error('❌ Failed to create verification token:');
    console.error(error);
    
    if (error.code === 'P2025') {
      console.error('User not found with the provided ID');
    }
    
    throw error;
  }
}

/**
 * Find a user by email
 */
async function findUserByEmail(email) {
  console.log(`\n🔍 Looking up user with email: ${email}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        verificationToken: true,
      }
    });
    
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      return null;
    }
    
    console.log('✅ User found:');
    console.log(JSON.stringify(user, null, 2));
    return user;
  } catch (error) {
    console.error('❌ Error finding user:', error);
    throw error;
  }
}

/**
 * Verify that token was saved correctly
 */
async function verifyTokenSaved(userId) {
  console.log(`\n🔍 Verifying token was saved for user ID: ${userId}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        verificationToken: true,
        verificationTokenExpiry: true,
      }
    });
    
    if (!user) {
      console.error('❌ User not found during verification check');
      return false;
    }
    
    if (!user.verificationToken) {
      console.error('❌ Verification token is null or undefined!');
      return false;
    }
    
    console.log('✅ Token verification successful!');
    console.log('Token:', user.verificationToken);
    console.log('Expiry:', user.verificationTokenExpiry);
    return true;
  } catch (error) {
    console.error('❌ Error verifying token:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting verification token test');
    console.log('==================================');
    
    // Get email from command line or use default
    const email = process.argv[2] || 'perfect_test@example.com';
    
    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      console.error('❌ Cannot proceed without a valid user');
      process.exit(1);
    }
    
    // Create verification token
    const token = await createVerificationToken(user.id);
    
    // Verify token was saved
    const verified = await verifyTokenSaved(user.id);
    
    if (verified) {
      console.log('\n✅ TEST PASSED: Token was created and saved successfully!');
      
      // Generate verification URL for testing
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5002';
      const verificationUrl = `${baseUrl}/auth/verify?token=${token}`;
      console.log('\n🔗 Verification URL for testing:');
      console.log(verificationUrl);
    } else {
      console.error('\n❌ TEST FAILED: Token was not saved correctly');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
  } finally {
    // Clean up
    await prisma.$disconnect();
  }
}

// Run the test
main();
