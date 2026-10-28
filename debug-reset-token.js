/**
 * Password Reset Token Debug Utility for CareLinkAI
 * 
 * This script helps debug password reset tokens by:
 * - Looking up a user's reset token information
 * - Displaying token expiration status
 * - Generating test URLs and API commands
 * - Providing helpful commands for testing the password reset flow
 * 
 * Usage: node debug-reset-token.js <email>
 * Example: node debug-reset-token.js user@example.com
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:5002';

async function debugResetToken() {
  try {
    // Get email from command line arguments or prompt for it
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Error: Email address required');
      console.error('Usage: node debug-reset-token.js <email>');
      process.exit(1);
    }
    
    console.log(`🔍 Looking up password reset token for user: ${email}`);
    
    // Query the database for the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        resetPasswordToken: true,
        resetPasswordTokenExpiry: true,
        createdAt: true
      }
    });
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }
    
    console.log('\n📋 User Information:');
    console.log('--------------------------------------------------');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Status: ${user.status}`);
    console.log(`Created At: ${user.createdAt}`);
    
    console.log('\n🔑 Password Reset Token Information:');
    console.log('--------------------------------------------------');
    
    if (user.resetPasswordToken) {
      console.log(`Token: ${user.resetPasswordToken}`);
      console.log(`Expiry: ${user.resetPasswordTokenExpiry}`);
      
      // Check if token is expired
      const now = new Date();
      const isExpired = user.resetPasswordTokenExpiry < now;
      console.log(`Token Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      
      // Calculate time remaining until expiry
      if (!isExpired) {
        const timeRemaining = user.resetPasswordTokenExpiry - now;
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Time Remaining: ${hoursRemaining}h ${minutesRemaining}m`);
      }
      
      // Generate reset URL for testing
      const resetUrl = `${APP_URL}/auth/reset-password?token=${user.resetPasswordToken}`;
      
      console.log('\n🔗 Password Reset URLs for Testing:');
      console.log('--------------------------------------------------');
      console.log('Frontend Reset Page:');
      console.log(resetUrl);
      
      console.log('\n🧪 API Test Commands:');
      console.log('--------------------------------------------------');
      console.log('1. Validate Token (cURL):');
      console.log(`curl -X POST ${APP_URL}/api/auth/validate-reset-token -H "Content-Type: application/json" -d '{"token":"${user.resetPasswordToken}"}'`);
      
      console.log('\n2. Validate Token (PowerShell):');
      console.log(`$body = @{ token = '${user.resetPasswordToken}' } | ConvertTo-Json`);
      console.log(`Invoke-RestMethod -Uri "${APP_URL}/api/auth/validate-reset-token" -Method POST -ContentType "application/json" -Body $body`);
      
      console.log('\n3. Reset Password (cURL):');
      console.log(`curl -X POST ${APP_URL}/api/auth/reset-password -H "Content-Type: application/json" -d '{"token":"${user.resetPasswordToken}","password":"NewPassword123!","confirmPassword":"NewPassword123!"}'`);
      
      console.log('\n4. Reset Password (PowerShell):');
      console.log(`$body = @{ token = '${user.resetPasswordToken}'; password = 'NewPassword123!'; confirmPassword = 'NewPassword123!' } | ConvertTo-Json`);
      console.log(`Invoke-RestMethod -Uri "${APP_URL}/api/auth/reset-password" -Method POST -ContentType "application/json" -Body $body`);
      
    } else {
      console.log('❌ No password reset token found for this user.');
      console.log('Possible reasons:');
      console.log('1. User has not requested a password reset');
      console.log('2. Token has already been used');
      console.log('3. Token was manually cleared');
      
      console.log('\n📝 Generate a new reset token:');
      console.log('--------------------------------------------------');
      console.log(`curl -X POST ${APP_URL}/api/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"${user.email}"}'`);
      
      console.log('\nOr with PowerShell:');
      console.log(`$body = @{ email = '${user.email}' } | ConvertTo-Json`);
      console.log(`Invoke-RestMethod -Uri "${APP_URL}/api/auth/forgot-password" -Method POST -ContentType "application/json" -Body $body`);
    }
    
  } catch (error) {
    console.error('Error debugging reset token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
debugResetToken();
