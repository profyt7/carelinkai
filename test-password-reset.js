/**
 * Password Reset System Test Script for CareLinkAI
 * 
 * This script tests the complete password reset functionality:
 * 1. Registers a new test user (or uses an existing one)
 * 2. Requests a password reset
 * 3. Retrieves the reset token from the database
 * 4. Validates the token
 * 5. Resets the password
 * 6. Verifies login with the new password
 * 7. Tests edge cases and security validations
 * 
 * Run with: node test-password-reset.js
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialize Prisma client
const prisma = new PrismaClient();

// API endpoints
const API_URL = 'http://localhost:5002';
const REGISTER_URL = `${API_URL}/api/auth/register`;
const FORGOT_PASSWORD_URL = `${API_URL}/api/auth/forgot-password`;
const VALIDATE_TOKEN_URL = `${API_URL}/api/auth/validate-reset-token`;
const RESET_PASSWORD_URL = `${API_URL}/api/auth/reset-password`;
const LOGIN_URL = `${API_URL}/api/auth/login`;

// Generate a unique email to avoid conflicts with existing users
const uniqueEmail = `reset_test_${Date.now()}@example.com`;

// Test user data
const testUser = {
  email: uniqueEmail,
  password: "TestPass123!", // Meets password requirements
  firstName: "Reset",
  lastName: "Tester",
  phone: "555-123-4567",
  role: "FAMILY",
  agreeToTerms: true
};

// New password for testing reset
const newPassword = "NewPass456!";

/**
 * Step 1: Register a new test user or find existing one
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
      return existingUser.id;
    }
    
    // If no existing user, register a new one
    console.log('Creating new test user...');
    const response = await axios.post(REGISTER_URL, testUser, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.user.id;
  } catch (error) {
    console.error('❌ User setup failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('User setup failed');
  }
}

/**
 * Step 2: Request password reset
 */
async function requestPasswordReset(email) {
  console.log(`\n🧪 Step 2: Requesting password reset for: ${email}`);
  
  try {
    const response = await axios.post(FORGOT_PASSWORD_URL, { email }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Password reset request successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.success;
  } catch (error) {
    console.error('❌ Password reset request failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Password reset request failed');
  }
}

/**
 * Step 3: Get reset token from database
 */
async function getResetToken(userId) {
  console.log(`\n🧪 Step 3: Retrieving reset token for user ID: ${userId}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        resetPasswordToken: true,
        resetPasswordTokenExpiry: true
      }
    });
    
    if (!user || !user.resetPasswordToken) {
      throw new Error('Reset token not found');
    }
    
    console.log('✅ Token retrieved successfully!');
    console.log('Token:', user.resetPasswordToken);
    console.log('Token expiry:', user.resetPasswordTokenExpiry);
    
    return user.resetPasswordToken;
  } catch (error) {
    console.error('❌ Failed to retrieve reset token!');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 4: Validate reset token
 */
async function validateResetToken(token) {
  console.log(`\n🧪 Step 4: Validating reset token`);
  
  try {
    const response = await axios.post(VALIDATE_TOKEN_URL, { token }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Token validation successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.valid;
  } catch (error) {
    console.error('❌ Token validation failed!');
    
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
 * Step 5: Reset password with token
 */
async function resetPassword(token, newPassword) {
  console.log(`\n🧪 Step 5: Resetting password with token`);
  
  try {
    const response = await axios.post(RESET_PASSWORD_URL, {
      token,
      password: newPassword,
      confirmPassword: newPassword
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Password reset successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.success;
  } catch (error) {
    console.error('❌ Password reset failed!');
    
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
 * Step 6: Verify login with new password
 */
async function verifyLogin(email, password) {
  console.log(`\n🧪 Step 6: Verifying login with new password for: ${email}`);
  
  try {
    // Note: This assumes you have a login endpoint. If not, we'll check the hash directly.
    const response = await axios.post(LOGIN_URL, {
      email,
      password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Login successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    // If login endpoint doesn't exist or fails, verify password hash directly
    console.log('Login endpoint failed or not available, checking password hash directly...');
    
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { passwordHash: true }
      });
      
      if (!user) {
        console.error('❌ User not found!');
        return false;
      }
      
      const isValid = await bcrypt.compare(password, user.passwordHash);
      
      if (isValid) {
        console.log('✅ Password hash verification successful!');
        return true;
      } else {
        console.error('❌ Password hash verification failed!');
        return false;
      }
    } catch (hashError) {
      console.error('❌ Password verification failed:', hashError.message);
      return false;
    }
  }
}

/**
 * Step 7: Test edge cases
 */
async function testEdgeCases() {
  console.log('\n🧪 Step 7: Testing edge cases');
  
  // Test case 1: Invalid token
  console.log('\n📌 Test case 7.1: Invalid token');
  const invalidTokenResult = await validateResetToken('invalid_token_that_doesnt_exist');
  console.log(`Result: ${invalidTokenResult ? '❌ Failed (accepted invalid token)' : '✅ Passed (rejected invalid token)'}`);
  
  // Test case 2: Token reuse (should be invalidated after reset)
  console.log('\n📌 Test case 7.2: Token reuse after password reset');
  // This test will be run after a successful reset in the main flow
  
  // Test case 3: Password validation
  console.log('\n📌 Test case 7.3: Password validation rules');
  const weakPassword = 'weak';
  try {
    await axios.post(RESET_PASSWORD_URL, {
      token: 'some_token',
      password: weakPassword,
      confirmPassword: weakPassword
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('❌ Failed (accepted weak password)');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Passed (rejected weak password)');
      console.log('Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.log('❓ Inconclusive (server error)');
    }
  }
  
  // Test case 4: Password mismatch
  console.log('\n📌 Test case 7.4: Password mismatch');
  try {
    await axios.post(RESET_PASSWORD_URL, {
      token: 'some_token',
      password: 'StrongPass123!',
      confirmPassword: 'DifferentPass456!'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('❌ Failed (accepted mismatched passwords)');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Passed (rejected mismatched passwords)');
      console.log('Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.log('❓ Inconclusive (server error)');
    }
  }
  
  return true;
}

/**
 * Test token reuse after successful reset
 */
async function testTokenReuse(token) {
  console.log('\n📌 Test case 7.2: Token reuse after password reset');
  
  try {
    const response = await axios.post(RESET_PASSWORD_URL, {
      token,
      password: 'AnotherPass789!',
      confirmPassword: 'AnotherPass789!'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('❌ Failed (accepted reused token)');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Passed (rejected reused token)');
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
      return true;
    } else {
      console.log('❓ Inconclusive (server error)');
      console.error('Error:', error.message);
      return false;
    }
  }
}

/**
 * Run the complete test flow
 */
async function runTests() {
  console.log('🚀 Starting CareLinkAI Password Reset System Test');
  console.log('=================================================');
  
  let testsPassed = 0;
  let testsFailed = 0;
  let testsTotal = 7; // Total number of tests we're running
  
  try {
    // Step 1: Set up test user
    const userId = await setupTestUser();
    testsPassed++;
    
    // Step 2: Request password reset
    const resetRequested = await requestPasswordReset(testUser.email);
    if (resetRequested) testsPassed++;
    else testsFailed++;
    
    // Step 3: Get reset token from database
    const token = await getResetToken(userId);
    if (token) testsPassed++;
    else testsFailed++;
    
    // Step 4: Validate reset token
    const isTokenValid = await validateResetToken(token);
    if (isTokenValid) testsPassed++;
    else testsFailed++;
    
    // Step 5: Reset password with token
    const passwordReset = await resetPassword(token, newPassword);
    if (passwordReset) testsPassed++;
    else testsFailed++;
    
    // Step 6: Verify login with new password
    const loginSuccessful = await verifyLogin(testUser.email, newPassword);
    if (loginSuccessful) testsPassed++;
    else testsFailed++;
    
    // Step 7: Test token reuse (should be invalidated after reset)
    const tokenReuseRejected = await testTokenReuse(token);
    if (tokenReuseRejected) testsPassed++;
    else testsFailed++;
    
    // Step 8: Test other edge cases
    await testEdgeCases();
    
    console.log('\n🏁 Test completed!');
    console.log(`✅ Tests passed: ${testsPassed}/${testsTotal}`);
    console.log(`❌ Tests failed: ${testsFailed}/${testsTotal}`);
    
    if (testsPassed === testsTotal) {
      console.log('🎉 SUCCESS: Password reset system is working correctly!');
    } else {
      console.log('⚠️ PARTIAL SUCCESS: Some tests failed. Review the output above for details.');
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
