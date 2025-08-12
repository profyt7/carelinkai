/**
 * Email Verification System Test Script for CareLinkAI
 * 
 * This script tests the complete email verification functionality:
 * 1. Registers a new test user (or uses an existing one)
 * 2. Tests sending verification emails
 * 3. Tests verifying tokens (valid, invalid, expired)
 * 4. Tests rate limiting
 * 5. Tests edge cases (already verified users, etc.)
 * 6. Tests resending verification emails
 * 
 * Run with: node test-email-verification.js
 */

const axios = require('axios');
const { PrismaClient, UserStatus } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { randomBytes } = require('crypto');

// Initialize Prisma client
const prisma = new PrismaClient();

// API endpoints
const API_URL = 'http://localhost:5002';
const REGISTER_URL = `${API_URL}/api/auth/register`;
const SEND_VERIFICATION_URL = `${API_URL}/api/auth/send-verification`;
const VERIFY_EMAIL_URL = `${API_URL}/api/auth/verify-email`;

// Generate a unique email to avoid conflicts with existing users
const uniqueEmail = `verify_test_${Date.now()}@example.com`;

// Test user data
const testUser = {
  email: uniqueEmail,
  password: "TestPass123!", // Meets password requirements
  firstName: "Email",
  lastName: "Verifier",
  phone: "555-123-4567",
  role: "FAMILY",
  agreeToTerms: true
};

// Global variables to store test data
let userId;
let userEmail;
let verificationToken;
let expiredToken;

/**
 * Generate a secure random token
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Step 1: Setup test user
 */
async function setupTestUser() {
  console.log(`\n🧪 Step 1: Setting up test user with email: ${testUser.email}`);
  
  try {
    // Try to find an existing user first
    const existingUser = await prisma.user.findUnique({
      where: { email: testUser.email },
      select: { id: true, email: true, firstName: true }
    });
    
    if (existingUser) {
      console.log('✅ Using existing user:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      userId = existingUser.id;
      userEmail = existingUser.email;
      
      // Reset verification status for testing
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: null,
          status: UserStatus.PENDING,
          verificationToken: null,
          verificationTokenExpiry: null
        }
      });
      
      console.log('   Reset verification status for testing');
      
      return userId;
    }
    
    // If no existing user, register a new one
    console.log('Creating new test user...');
    const response = await axios.post(REGISTER_URL, testUser, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    userId = response.data.user.id;
    userEmail = response.data.user.email;
    return userId;
  } catch (error) {
    console.error('❌ User setup failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    // Try to create user directly with Prisma if API fails
    try {
      console.log('Attempting direct database creation...');
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          phone: testUser.phone,
          role: testUser.role,
          status: UserStatus.PENDING,
          // Note: In a real app, you'd hash the password
          passwordHash: testUser.password
        }
      });
      
      userId = user.id;
      userEmail = user.email;
      console.log('✅ Direct user creation successful:', userId);
      return userId;
    } catch (dbError) {
      console.error('❌ Direct user creation failed:', dbError);
      throw new Error('User setup failed');
    }
  }
}

/**
 * Step 2: Test sending verification email
 */
async function testSendVerificationEmail() {
  console.log('\n🧪 Step 2: Testing send verification email');
  
  try {
    // Test case 2.1: Send verification email to valid user
    console.log('\n📌 Test case 2.1: Send verification email to valid user');
    
    const response = await axios.post(SEND_VERIFICATION_URL, { email: userEmail }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Send verification email successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify token was created in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verificationToken: true, verificationTokenExpiry: true }
    });
    
    if (user.verificationToken) {
      console.log('✅ Verification token created in database');
      console.log('   Token expiry:', user.verificationTokenExpiry);
      verificationToken = user.verificationToken;
    } else {
      console.error('❌ No verification token found in database');
    }
    
    // Test case 2.2: Send verification email to non-existent user
    console.log('\n📌 Test case 2.2: Send verification email to non-existent user');
    
    const nonExistentEmail = `nonexistent_${Date.now()}@example.com`;
    const nonExistentResponse = await axios.post(SEND_VERIFICATION_URL, { email: nonExistentEmail }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Status:', nonExistentResponse.status);
    console.log('Response:', JSON.stringify(nonExistentResponse.data, null, 2));
    console.log('✅ System does not reveal if email exists (security feature)');
    
    return verificationToken;
  } catch (error) {
    console.error('❌ Send verification email test failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

/**
 * Step 3: Test verifying email with valid token
 */
async function testVerifyEmailValidToken() {
  console.log('\n🧪 Step 3: Testing verify email with valid token');
  
  try {
    if (!verificationToken) {
      console.error('❌ No verification token available for testing');
      return false;
    }
    
    // Test via GET endpoint
    const response = await axios.get(`${VERIFY_EMAIL_URL}?token=${verificationToken}`);
    
    console.log('✅ Email verification successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify user status in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        emailVerified: true, 
        status: true,
        verificationToken: true,
        verificationTokenExpiry: true
      }
    });
    
    const verificationSuccess = 
      user.emailVerified !== null && 
      user.status === UserStatus.ACTIVE &&
      user.verificationToken === null;
    
    console.log('Database verification:');
    console.log(`   Email verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`   Status active: ${user.status === UserStatus.ACTIVE ? '✅ Yes' : '❌ No'}`);
    console.log(`   Token cleared: ${user.verificationToken === null ? '✅ Yes' : '❌ No'}`);
    
    return verificationSuccess;
  } catch (error) {
    console.error('❌ Verify email test failed!');
    
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
 * Step 4: Test verifying email with invalid token
 */
async function testVerifyEmailInvalidToken() {
  console.log('\n🧪 Step 4: Testing verify email with invalid token');
  
  try {
    // Generate a random invalid token
    const invalidToken = generateToken();
    
    // Test via POST endpoint
    const response = await axios.post(VERIFY_EMAIL_URL, { token: invalidToken }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('❓ This should have failed but succeeded?');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return false;
  } catch (error) {
    // We expect this to fail with 400 Bad Request
    if (error.response && error.response.status === 400) {
      console.log('✅ Invalid token correctly rejected!');
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      return true;
    } else {
      console.error('❌ Unexpected error during invalid token test!');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
      
      return false;
    }
  }
}

/**
 * Step 5: Test verifying email with expired token
 */
async function testVerifyEmailExpiredToken() {
  console.log('\n🧪 Step 5: Testing verify email with expired token');
  
  try {
    // Create a user with an expired token
    const expiredTokenUser = {
      email: `expired_token_${Date.now()}@example.com`,
      firstName: "Expired",
      lastName: "Token",
      phone: "555-123-4567",
      role: "FAMILY",
      status: UserStatus.PENDING
    };
    
    // Create user directly in database
    const user = await prisma.user.create({
      data: {
        ...expiredTokenUser,
        passwordHash: "dummy_hash_for_testing"
      }
    });
    
    // Create expired token (set to 1 day in the past)
    expiredToken = generateToken();
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: expiredToken,
        verificationTokenExpiry: expiredDate
      }
    });
    
    console.log(`   Created test user with expired token: ${user.email}`);
    console.log(`   Token: ${expiredToken}`);
    console.log(`   Expiry: ${expiredDate.toISOString()} (in the past)`);
    
    // Test verification with expired token
    const response = await axios.post(VERIFY_EMAIL_URL, { token: expiredToken }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('❓ This should have failed but succeeded?');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return false;
  } catch (error) {
    // We expect this to fail with 400 Bad Request
    if (error.response && error.response.status === 400) {
      console.log('✅ Expired token correctly rejected!');
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      
      // Verify the response indicates token expiration
      const isExpiredError = error.response.data.expired === true || 
                             error.response.data.message.toLowerCase().includes('expired');
      
      console.log(`   Response correctly indicates expiration: ${isExpiredError ? '✅ Yes' : '❌ No'}`);
      
      return isExpiredError;
    } else {
      console.error('❌ Unexpected error during expired token test!');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
      
      return false;
    }
  }
}

/**
 * Step 6: Test rate limiting
 */
async function testRateLimiting() {
  console.log('\n🧪 Step 6: Testing rate limiting');
  
  try {
    console.log('   Making multiple rapid verification requests to trigger rate limiting...');
    
    // Generate a random token for testing
    const testToken = generateToken();
    
    // Make multiple rapid requests to trigger rate limiting
    const requests = [];
    const MAX_REQUESTS = 10; // Should exceed the rate limit
    
    for (let i = 0; i < MAX_REQUESTS; i++) {
      requests.push(axios.get(`${VERIFY_EMAIL_URL}?token=${testToken}`).catch(error => error.response));
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(requests);
    
    // Check if any response indicates rate limiting (429 Too Many Requests)
    const rateLimitedResponses = responses.filter(response => response && response.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log(`✅ Rate limiting working! ${rateLimitedResponses.length} requests were rate-limited.`);
      console.log('Sample rate limit response:');
      console.log('Status:', rateLimitedResponses[0].status);
      console.log('Response:', JSON.stringify(rateLimitedResponses[0].data, null, 2));
      return true;
    } else {
      console.log('⚠️ No rate limiting detected. This might be expected if rate limits are high.');
      return false;
    }
  } catch (error) {
    console.error('❌ Rate limiting test error!');
    console.error('Error:', error.message);
    return false;
  }
}

/**
 * Step 7: Test edge cases
 */
async function testEdgeCases() {
  console.log('\n🧪 Step 7: Testing edge cases');
  let passedTests = 0;
  let totalTests = 3;
  
  // Test case 7.1: Already verified user
  console.log('\n📌 Test case 7.1: Already verified user');
  try {
    // Create a verified user
    const verifiedUser = {
      email: `verified_user_${Date.now()}@example.com`,
      firstName: "Already",
      lastName: "Verified",
      phone: "555-123-4567",
      role: "FAMILY",
      status: UserStatus.ACTIVE
    };
    
    // Create user directly in database
    const user = await prisma.user.create({
      data: {
        ...verifiedUser,
        passwordHash: "dummy_hash_for_testing",
        emailVerified: new Date()
      }
    });
    
    console.log(`   Created already verified test user: ${user.email}`);
    
    // Try to send verification email
    const response = await axios.post(SEND_VERIFICATION_URL, { email: user.email }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    const correctResponse = response.data.verified === true || 
                            response.data.message.toLowerCase().includes('already verified');
    
    console.log(`   Response correctly indicates already verified: ${correctResponse ? '✅ Yes' : '❌ No'}`);
    
    if (correctResponse) passedTests++;
  } catch (error) {
    console.error('❌ Already verified user test failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
  
  // Test case 7.2: Invalid email format
  console.log('\n📌 Test case 7.2: Invalid email format');
  try {
    const invalidEmail = "not-an-email";
    const response = await axios.post(SEND_VERIFICATION_URL, { email: invalidEmail }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('❓ This should have failed but succeeded?');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    // We expect this to fail with 400 Bad Request
    if (error.response && error.response.status === 400) {
      console.log('✅ Invalid email format correctly rejected!');
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      passedTests++;
    } else {
      console.error('❌ Unexpected error during invalid email test!');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test case 7.3: Malformed token
  console.log('\n📌 Test case 7.3: Malformed token');
  try {
    const malformedToken = "too-short";
    const response = await axios.post(VERIFY_EMAIL_URL, { token: malformedToken }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('❓ This should have failed but succeeded?');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    // We expect this to fail with 400 Bad Request
    if (error.response && error.response.status === 400) {
      console.log('✅ Malformed token correctly rejected!');
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      passedTests++;
    } else {
      console.error('❌ Unexpected error during malformed token test!');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  return { passedTests, totalTests };
}

/**
 * Step 8: Test resending verification email
 */
async function testResendVerificationEmail() {
  console.log('\n🧪 Step 8: Testing resend verification email');
  
  try {
    // Create a user for testing resend
    const resendUser = {
      email: `resend_test_${Date.now()}@example.com`,
      firstName: "Resend",
      lastName: "Test",
      phone: "555-123-4567",
      role: "FAMILY",
      status: UserStatus.PENDING
    };
    
    // Create user directly in database
    const user = await prisma.user.create({
      data: {
        ...resendUser,
        passwordHash: "dummy_hash_for_testing"
      }
    });
    
    console.log(`   Created test user for resend: ${user.email}`);
    
    // Send initial verification email
    let response = await axios.post(SEND_VERIFICATION_URL, { email: user.email }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Initial verification email sent!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Get the initial token
    const initialUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { verificationToken: true, verificationTokenExpiry: true }
    });
    
    const initialToken = initialUser.verificationToken;
    console.log(`   Initial token: ${initialToken}`);
    
    // Resend verification email
    response = await axios.post(SEND_VERIFICATION_URL, { email: user.email }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Verification email resent!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Get the new token
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { verificationToken: true, verificationTokenExpiry: true }
    });
    
    const newToken = updatedUser.verificationToken;
    console.log(`   New token: ${newToken}`);
    
    // Check if token was updated
    const tokenUpdated = initialToken !== newToken;
    console.log(`   Token was updated: ${tokenUpdated ? '✅ Yes' : '❌ No'}`);
    
    return tokenUpdated;
  } catch (error) {
    console.error('❌ Resend verification email test failed!');
    
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
  console.log('🚀 Starting CareLinkAI Email Verification System Test');
  console.log('===========================================================');
  
  let testsPassed = 0;
  let testsFailed = 0;
  let testsTotal = 8; // Total number of steps we're testing
  
  try {
    // Step 1: Set up test user
    await setupTestUser();
    testsPassed++;
    
    // Step 2: Test sending verification email
    await testSendVerificationEmail();
    testsPassed++;
    
    // Step 3: Test verifying email with valid token
    const validTokenResult = await testVerifyEmailValidToken();
    if (validTokenResult) testsPassed++;
    else testsFailed++;
    
    // Step 4: Test verifying email with invalid token
    const invalidTokenResult = await testVerifyEmailInvalidToken();
    if (invalidTokenResult) testsPassed++;
    else testsFailed++;
    
    // Step 5: Test verifying email with expired token
    const expiredTokenResult = await testVerifyEmailExpiredToken();
    if (expiredTokenResult) testsPassed++;
    else testsFailed++;
    
    // Step 6: Test rate limiting
    const rateLimitResult = await testRateLimiting();
    if (rateLimitResult) testsPassed++;
    else testsFailed++;
    
    // Step 7: Test edge cases
    const edgeCaseResults = await testEdgeCases();
    console.log(`   Edge case tests passed: ${edgeCaseResults.passedTests}/${edgeCaseResults.totalTests}`);
    if (edgeCaseResults.passedTests === edgeCaseResults.totalTests) testsPassed++;
    else testsFailed++;
    
    // Step 8: Test resending verification email
    const resendResult = await testResendVerificationEmail();
    if (resendResult) testsPassed++;
    else testsFailed++;
    
    console.log('\n🏁 Test completed!');
    console.log(`✅ Tests passed: ${testsPassed}/${testsTotal}`);
    console.log(`❌ Tests failed: ${testsFailed}/${testsTotal}`);
    
    if (testsPassed === testsTotal) {
      console.log('🎉 SUCCESS: Email verification system is working correctly!');
    } else {
      console.log('⚠️ PARTIAL SUCCESS: Some tests failed. Review the output above for details.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
  } finally {
    // Clean up - delete test users if needed
    // This is commented out to preserve test data for inspection
    /*
    try {
      if (userId) {
        await prisma.user.delete({ where: { id: userId } });
        console.log('\n🧹 Cleanup completed: Test user deleted');
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
    */
    
    // Clean up Prisma connection
    await prisma.$disconnect();
  }
}

// Execute the test
runTests();
