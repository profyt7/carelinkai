/**
 * Complete Authentication Flow Test Script for CareLinkAI
 * 
 * This script tests the entire authentication flow:
 * 1. User Registration
 * 2. Email Verification
 * 3. Password Reset
 * 4. Two-Factor Authentication Setup
 * 5. Login with 2FA
 * 
 * Each step builds on the previous one, creating a comprehensive test
 * of the entire authentication system.
 * 
 * Run with: node test-complete-auth-flow.js
 */

const axios = require('axios');
const { PrismaClient, UserStatus } = require('@prisma/client');
const { authenticator } = require('otplib');
const { v4: uuidv4 } = require('uuid');
const { randomBytes } = require('crypto');
const QRCode = require('qrcode');

// Initialize Prisma client
const prisma = new PrismaClient();

// API endpoints
const API_URL = 'http://localhost:5002';
const REGISTER_URL = `${API_URL}/api/auth/register`;
const LOGIN_URL = `${API_URL}/api/auth/login`;
const SEND_VERIFICATION_URL = `${API_URL}/api/auth/send-verification`;
const VERIFY_EMAIL_URL = `${API_URL}/api/auth/verify-email`;
const REQUEST_PASSWORD_RESET_URL = `${API_URL}/api/auth/forgot-password`;
const RESET_PASSWORD_URL = `${API_URL}/api/auth/reset-password`;
const SETUP_2FA_URL = `${API_URL}/api/auth/setup-2fa`;
const VERIFY_2FA_URL = `${API_URL}/api/auth/verify-2fa`;
const BACKUP_CODES_URL = `${API_URL}/api/auth/backup-codes`;
const DISABLE_2FA_URL = `${API_URL}/api/auth/disable-2fa`;

// Generate a unique email to avoid conflicts with existing users
const uniqueEmail = `auth_flow_test_${Date.now()}@example.com`;

// Test user data
const testUser = {
  email: uniqueEmail,
  password: "TestPass123!", // Meets password requirements
  firstName: "Auth",
  lastName: "Tester",
  phone: "555-123-4567",
  role: "FAMILY",
  agreeToTerms: true
};

// Global variables to store test data
let userId;
let userEmail;
let userPassword = testUser.password;
let verificationToken;
let passwordResetToken;
let twoFactorSecret;
let backupCodes;
let sessionToken;

/**
 * Generate a secure random token (for testing purposes)
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Step 1: Register a new test user
 */
async function registerUser() {
  console.log('\n🧪 Step 1: User Registration');
  
  try {
    // Try to find an existing user first
    const existingUser = await prisma.user.findUnique({
      where: { email: testUser.email },
      select: { id: true, email: true }
    });
    
    if (existingUser) {
      console.log('✅ Using existing user:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      userId = existingUser.id;
      userEmail = existingUser.email;
      
      // Reset user status for testing
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: null,
          status: UserStatus.PENDING,
          verificationToken: null,
          verificationTokenExpiry: null,
          resetPasswordToken: null,
          resetPasswordTokenExpiry: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null
        }
      });
      
      console.log('   Reset user status for testing');
      
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
 * Step 2: Email Verification
 */
async function verifyEmail() {
  console.log('\n🧪 Step 2: Email Verification');
  
  try {
    // Step 2.1: Send verification email
    console.log('\n📌 Step 2.1: Send verification email');
    
    const sendResponse = await axios.post(SEND_VERIFICATION_URL, { email: userEmail }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Verification email sent!');
    console.log('Status:', sendResponse.status);
    console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
    
    // Get verification token from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verificationToken: true, verificationTokenExpiry: true }
    });
    
    if (!user.verificationToken) {
      throw new Error('No verification token found in database');
    }
    
    verificationToken = user.verificationToken;
    console.log('   Verification token retrieved:', verificationToken);
    console.log('   Token expiry:', user.verificationTokenExpiry);
    
    // Step 2.2: Verify email with token
    console.log('\n📌 Step 2.2: Verify email with token');
    
    const verifyResponse = await axios.get(`${VERIFY_EMAIL_URL}?token=${verificationToken}`);
    
    console.log('✅ Email verification successful!');
    console.log('Status:', verifyResponse.status);
    console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));
    
    // Verify user status in database
    const verifiedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        emailVerified: true, 
        status: true,
        verificationToken: true
      }
    });
    
    const verificationSuccess = 
      verifiedUser.emailVerified !== null && 
      verifiedUser.status === UserStatus.ACTIVE &&
      verifiedUser.verificationToken === null;
    
    console.log('Database verification:');
    console.log(`   Email verified: ${verifiedUser.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`   Status active: ${verifiedUser.status === UserStatus.ACTIVE ? '✅ Yes' : '❌ No'}`);
    console.log(`   Token cleared: ${verifiedUser.verificationToken === null ? '✅ Yes' : '❌ No'}`);
    
    return verificationSuccess;
  } catch (error) {
    console.error('❌ Email verification failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Email verification failed');
  }
}

/**
 * Step 3: Password Reset
 */
async function resetPassword() {
  console.log('\n🧪 Step 3: Password Reset');
  
  try {
    // Step 3.1: Request password reset
    console.log('\n📌 Step 3.1: Request password reset');
    
    const requestResponse = await axios.post(REQUEST_PASSWORD_RESET_URL, { email: userEmail }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Password reset requested!');
    console.log('Status:', requestResponse.status);
    console.log('Response:', JSON.stringify(requestResponse.data, null, 2));
    
    // Get password reset token from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { resetPasswordToken: true, resetPasswordTokenExpiry: true }
    });
    
    if (!user.resetPasswordToken) {
      throw new Error('No password reset token found in database');
    }
    
    passwordResetToken = user.resetPasswordToken;
    console.log('   Password reset token retrieved:', passwordResetToken);
    console.log('   Token expiry:', user.resetPasswordTokenExpiry);
    
    // Step 3.2: Reset password with token
    console.log('\n📌 Step 3.2: Reset password with token');
    
    // Create a new password
    const newPassword = `NewPass${Date.now().toString().slice(-6)}!`;
    console.log('   New password:', newPassword);
    
    const resetResponse = await axios.post(RESET_PASSWORD_URL, {
      token: passwordResetToken,
      password: newPassword,
      confirmPassword: newPassword
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Password reset successful!');
    console.log('Status:', resetResponse.status);
    console.log('Response:', JSON.stringify(resetResponse.data, null, 2));
    
    // Update the password for future tests
    userPassword = newPassword;
    
    // Verify token is cleared from database
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { resetPasswordToken: true, resetPasswordTokenExpiry: true }
    });
    
    const resetSuccess = updatedUser.resetPasswordToken === null;
    
    console.log('Database verification:');
    console.log(`   Token cleared: ${resetSuccess ? '✅ Yes' : '❌ No'}`);
    
    return resetSuccess;
  } catch (error) {
    console.error('❌ Password reset failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Password reset failed');
  }
}

/**
 * Step 4: Login with new password
 */
async function loginWithPassword() {
  console.log('\n🧪 Step 4: Login with Password');
  
  try {
    const response = await axios.post(LOGIN_URL, {
      email: userEmail,
      password: userPassword
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Login successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Store session token if available
    if (response.data.token) {
      sessionToken = response.data.token;
      console.log('   Session token retrieved');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Login failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Login failed');
  }
}

/**
 * Step 5: Two-Factor Authentication Setup
 */
async function setup2FA() {
  console.log('\n🧪 Step 5: Two-Factor Authentication Setup');
  
  try {
    // Step 5.1: Setup 2FA
    console.log('\n📌 Step 5.1: Setup 2FA');
    
    const headers = sessionToken ? { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    } : { 
      'Content-Type': 'application/json'
    };
    
    const setupResponse = await axios.post(SETUP_2FA_URL, {}, { headers });
    
    console.log('✅ 2FA setup initiated!');
    console.log('Status:', setupResponse.status);
    console.log('Response:', JSON.stringify(setupResponse.data, null, 2));
    
    // Extract 2FA secret
    if (setupResponse.data.secret) {
      twoFactorSecret = setupResponse.data.secret;
      console.log('   2FA secret retrieved:', twoFactorSecret);
    } else {
      // If API doesn't return secret, try to get it from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true }
      });
      
      if (user.twoFactorSecret) {
        twoFactorSecret = user.twoFactorSecret;
        console.log('   2FA secret retrieved from database:', twoFactorSecret);
      } else {
        throw new Error('No 2FA secret found');
      }
    }
    
    // Step 5.2: Verify 2FA setup with TOTP code
    console.log('\n📌 Step 5.2: Verify 2FA setup with TOTP code');
    
    // Generate TOTP code
    const totpCode = authenticator.generate(twoFactorSecret);
    console.log('   Generated TOTP code:', totpCode);
    
    const verifyResponse = await axios.post(VERIFY_2FA_URL, {
      code: totpCode
    }, { headers });
    
    console.log('✅ 2FA verification successful!');
    console.log('Status:', verifyResponse.status);
    console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));
    
    // Verify 2FA is enabled in database
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true }
    });
    
    const setupSuccess = updatedUser.twoFactorEnabled === true && updatedUser.twoFactorSecret !== null;
    
    console.log('Database verification:');
    console.log(`   2FA enabled: ${updatedUser.twoFactorEnabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Secret stored: ${updatedUser.twoFactorSecret !== null ? '✅ Yes' : '❌ No'}`);
    
    // Step 5.3: Generate backup codes
    console.log('\n📌 Step 5.3: Generate backup codes');
    
    const backupResponse = await axios.post(BACKUP_CODES_URL, {}, { headers });
    
    console.log('✅ Backup codes generated!');
    console.log('Status:', backupResponse.status);
    console.log('Response:', JSON.stringify(backupResponse.data, null, 2));
    
    if (backupResponse.data.data && backupResponse.data.data.backupCodes) {
      backupCodes = backupResponse.data.data.backupCodes;
      console.log('   Backup codes retrieved:', backupCodes.length);
      console.log('   Sample code:', backupCodes[0]);
    }
    
    return setupSuccess;
  } catch (error) {
    console.error('❌ 2FA setup failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('2FA setup failed');
  }
}

/**
 * Step 6: Login with 2FA
 */
async function loginWith2FA() {
  console.log('\n🧪 Step 6: Login with 2FA');
  
  try {
    // Step 6.1: Initial login with password
    console.log('\n📌 Step 6.1: Initial login with password');
    
    const initialResponse = await axios.post(LOGIN_URL, {
      email: userEmail,
      password: userPassword
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Initial login step successful!');
    console.log('Status:', initialResponse.status);
    console.log('Response:', JSON.stringify(initialResponse.data, null, 2));
    
    // Check if 2FA is required
    const requires2FA = initialResponse.data.requiresTwoFactor === true;
    console.log(`   2FA required: ${requires2FA ? '✅ Yes' : '❌ No'}`);
    
    if (!requires2FA) {
      console.warn('⚠️ 2FA was not required during login, but should be');
    }
    
    // Step 6.2: Complete login with TOTP code
    console.log('\n📌 Step 6.2: Complete login with TOTP code');
    
    // Generate TOTP code
    const totpCode = authenticator.generate(twoFactorSecret);
    console.log('   Generated TOTP code:', totpCode);
    
    const completeResponse = await axios.post(LOGIN_URL, {
      email: userEmail,
      password: userPassword,
      twoFactorCode: totpCode
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Login with 2FA successful!');
    console.log('Status:', completeResponse.status);
    console.log('Response:', JSON.stringify(completeResponse.data, null, 2));
    
    // Store new session token if available
    if (completeResponse.data.token) {
      sessionToken = completeResponse.data.token;
      console.log('   New session token retrieved');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Login with 2FA failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    throw new Error('Login with 2FA failed');
  }
}

/**
 * Step 7: Disable 2FA (cleanup)
 */
async function disable2FA() {
  console.log('\n🧪 Step 7: Disable 2FA (Cleanup)');
  
  try {
    const headers = sessionToken ? { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    } : { 
      'Content-Type': 'application/json'
    };
    
    // Disable 2FA using password verification
    const response = await axios.post(DISABLE_2FA_URL, {
      verificationMethod: 'password',
      verificationValue: userPassword
    }, { headers });
    
    console.log('✅ 2FA disabled successfully!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify 2FA is disabled in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true, backupCodes: true }
    });
    
    const disableSuccess = 
      user.twoFactorEnabled === false && 
      user.twoFactorSecret === null &&
      user.backupCodes === null;
    
    console.log('Database verification:');
    console.log(`   2FA disabled: ${!user.twoFactorEnabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Secret cleared: ${user.twoFactorSecret === null ? '✅ Yes' : '❌ No'}`);
    console.log(`   Backup codes cleared: ${user.backupCodes === null ? '✅ Yes' : '❌ No'}`);
    
    return disableSuccess;
  } catch (error) {
    console.error('❌ 2FA disable failed!');
    
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
  console.log('🚀 Starting CareLinkAI Complete Authentication Flow Test');
  console.log('===========================================================');
  
  let testsPassed = 0;
  let testsFailed = 0;
  let testsTotal = 7; // Total number of steps we're testing
  
  try {
    // Step 1: Register user
    await registerUser();
    testsPassed++;
    
    // Step 2: Email verification
    const emailVerified = await verifyEmail();
    if (emailVerified) testsPassed++;
    else testsFailed++;
    
    // Step 3: Password reset
    const passwordReset = await resetPassword();
    if (passwordReset) testsPassed++;
    else testsFailed++;
    
    // Step 4: Login with new password
    const loginSuccess = await loginWithPassword();
    if (loginSuccess) testsPassed++;
    else testsFailed++;
    
    // Step 5: 2FA setup
    const twoFASetup = await setup2FA();
    if (twoFASetup) testsPassed++;
    else testsFailed++;
    
    // Step 6: Login with 2FA
    const twoFALogin = await loginWith2FA();
    if (twoFALogin) testsPassed++;
    else testsFailed++;
    
    // Step 7: Disable 2FA (cleanup)
    const twoFADisabled = await disable2FA();
    if (twoFADisabled) testsPassed++;
    else testsFailed++;
    
    console.log('\n🏁 Test completed!');
    console.log(`✅ Tests passed: ${testsPassed}/${testsTotal}`);
    console.log(`❌ Tests failed: ${testsFailed}/${testsTotal}`);
    
    if (testsPassed === testsTotal) {
      console.log('🎉 SUCCESS: Complete authentication flow is working correctly!');
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
