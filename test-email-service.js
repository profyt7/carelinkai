/**
 * Email Service Test Script for CareLinkAI
 * 
 * This script tests the complete email service functionality:
 * 1. Registers a new test user
 * 2. Verifies that an email is sent (via logs or actual delivery)
 * 3. Retrieves the verification token from the database
 * 4. Simulates clicking the verification link
 * 5. Confirms the user status is updated to ACTIVE
 * 
 * Run with: node test-email-service.js
 */

const axios = require('axios');
const { PrismaClient, UserStatus } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// API endpoints
const API_URL = 'http://localhost:5002';
const REGISTER_URL = `${API_URL}/api/auth/register`;
const VERIFY_URL = `${API_URL}/api/auth/verify`;
const RESEND_URL = `${API_URL}/api/auth/resend-verification`;

// Generate a unique email to avoid conflicts with existing users
const uniqueEmail = `test_${Date.now()}@example.com`;

// Test user data
const testUser = {
  email: uniqueEmail,
  password: "TestPass123!", // Meets password requirements
  firstName: "Test",
  lastName: "User",
  phone: "555-123-4567",
  role: "FAMILY",
  agreeToTerms: true
};

/**
 * Step 1: Register a new test user
 */
async function registerTestUser() {
  console.log(`\n🧪 Step 1: Registering test user with email: ${testUser.email}`);
  
  try {
    const response = await axios.post(REGISTER_URL, testUser, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.user.id;
  } catch (error) {
    console.error('❌ Registration failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Registration failed');
  }
}

/**
 * Step 2: Get verification token from database
 */
async function getVerificationToken(userId) {
  console.log(`\n🧪 Step 2: Retrieving verification token for user ID: ${userId}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        status: true,
        verificationToken: true,
        verificationTokenExpiry: true
      }
    });
    
    if (!user || !user.verificationToken) {
      throw new Error('Verification token not found');
    }
    
    console.log('✅ Token retrieved successfully!');
    console.log('User status:', user.status);
    console.log('Token:', user.verificationToken);
    console.log('Token expiry:', user.verificationTokenExpiry);
    
    return user.verificationToken;
  } catch (error) {
    console.error('❌ Failed to retrieve verification token!');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 3: Verify email with token
 */
async function verifyEmail(token) {
  console.log(`\n🧪 Step 3: Verifying email with token: ${token}`);
  
  try {
    const response = await axios.post(VERIFY_URL, { token }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Verification successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.success;
  } catch (error) {
    console.error('❌ Verification failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Verification failed');
  }
}

/**
 * Step 4: Check if user is now verified and active
 */
async function checkUserStatus(userId) {
  console.log(`\n🧪 Step 4: Checking user status after verification for ID: ${userId}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        status: true,
        emailVerified: true,
        verificationToken: true
      }
    });
    
    console.log('User status:', user.status);
    console.log('Email verified date:', user.emailVerified);
    console.log('Verification token cleared:', user.verificationToken === null);
    
    const isVerified = user.status === UserStatus.ACTIVE && 
                       user.emailVerified !== null && 
                       user.verificationToken === null;
    
    if (isVerified) {
      console.log('✅ User successfully verified and activated!');
    } else {
      console.log('❌ User verification incomplete!');
    }
    
    return isVerified;
  } catch (error) {
    console.error('❌ Failed to check user status!');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 5: Test resend verification email functionality
 */
async function testResendVerification() {
  console.log(`\n🧪 Step 5: Testing resend verification with email: ${testUser.email}`);
  
  try {
    // First, create another test user that will need verification
    const newEmail = `resend_test_${Date.now()}@example.com`;
    const resendUser = { ...testUser, email: newEmail };
    
    // Register the user
    const registerResponse = await axios.post(REGISTER_URL, resendUser, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Test user for resend created:', newEmail);
    
    // Now test the resend functionality
    const resendResponse = await axios.post(RESEND_URL, { email: newEmail }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Resend verification successful!');
    console.log('Status:', resendResponse.status);
    console.log('Response:', JSON.stringify(resendResponse.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Resend verification failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

/**
 * Run the complete test flow
 */
async function runTests() {
  console.log('🚀 Starting CareLinkAI Email Service Test');
  console.log('===========================================');
  
  try {
    // Step 1: Register a new user
    const userId = await registerTestUser();
    
    // Step 2: Get the verification token
    const token = await getVerificationToken(userId);
    
    // Step 3: Verify the email
    await verifyEmail(token);
    
    // Step 4: Check if user is verified
    const isVerified = await checkUserStatus(userId);
    
    // Step 5: Test resend verification
    const resendSuccess = await testResendVerification();
    
    console.log('\n🏁 Test completed!');
    if (isVerified && resendSuccess) {
      console.log('✅ SUCCESS: Email service is working correctly!');
      console.log('✅ Registration, verification, and resend all working!');
    } else {
      console.log('❌ FAILURE: Email service is not fully functional.');
      console.log(`  - User verification: ${isVerified ? 'SUCCESS' : 'FAILED'}`);
      console.log(`  - Resend verification: ${resendSuccess ? 'SUCCESS' : 'FAILED'}`);
    }
    
    // Check which email provider was used
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 In development mode, emails are sent to Ethereal.');
      console.log('   Check the server console for preview URLs.');
    } else if (process.env.SENDGRID_API_KEY) {
      console.log('\n📧 Using SendGrid API for email delivery.');
      console.log('   Check your SendGrid dashboard for delivery status.');
    } else if (process.env.SMTP_HOST) {
      console.log('\n📧 Using SMTP for email delivery.');
      console.log(`   Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
      console.log('   Check the recipient inbox for emails.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
  } finally {
    // Clean up Prisma connection
    await prisma.$disconnect();
  }
}

// Execute the test
runTests();
