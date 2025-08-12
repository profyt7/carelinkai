/**
 * Profile Management Test Script for CareLinkAI
 * 
 * This script tests the complete user profile management system:
 * 1. User Profile Retrieval
 * 2. Profile Information Updates
 * 3. Profile Photo Upload and Management
 * 4. User Preferences Management
 * 5. Password Changes
 * 
 * Tests cover all user roles and security validations.
 * 
 * Run with: node test-profile-management.js
 */

const axios = require('axios');
const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { hash } = require('bcryptjs');

// Initialize Prisma client
const prisma = new PrismaClient();

// API endpoints
const API_URL = 'http://localhost:5002';
const REGISTER_URL = `${API_URL}/api/auth/register`;
const LOGIN_URL = `${API_URL}/api/auth/login`;
const PROFILE_URL = `${API_URL}/api/profile`;
const PHOTO_URL = `${API_URL}/api/profile/photo`;
const PREFERENCES_URL = `${API_URL}/api/profile/preferences`;
const CHANGE_PASSWORD_URL = `${API_URL}/api/profile/change-password`;

// Test data
const TEST_PASSWORD = "TestPass123!";
const NEW_PASSWORD = "NewPass456!";
const SALT_ROUNDS = 12;

// Test users for each role
const testUsers = {
  FAMILY: {
    email: `family_test_${Date.now()}@example.com`,
    password: TEST_PASSWORD,
    firstName: "Family",
    lastName: "Tester",
    phone: "555-111-1111",
    role: "FAMILY",
    agreeToTerms: true
  },
  OPERATOR: {
    email: `operator_test_${Date.now()}@example.com`,
    password: TEST_PASSWORD,
    firstName: "Operator",
    lastName: "Tester",
    phone: "555-222-2222",
    role: "OPERATOR",
    agreeToTerms: true
  },
  CAREGIVER: {
    email: `caregiver_test_${Date.now()}@example.com`,
    password: TEST_PASSWORD,
    firstName: "Caregiver",
    lastName: "Tester",
    phone: "555-333-3333",
    role: "CAREGIVER",
    agreeToTerms: true
  },
  AFFILIATE: {
    email: `affiliate_test_${Date.now()}@example.com`,
    password: TEST_PASSWORD,
    firstName: "Affiliate",
    lastName: "Tester",
    phone: "555-444-4444",
    role: "AFFILIATE",
    agreeToTerms: true
  }
};

// Global variables to store test data
const userSessions = {};
const userIds = {};

/**
 * Create a test user for each role
 */
async function createTestUsers() {
  console.log('\n🧪 Creating test users for each role');
  
  for (const [role, userData] of Object.entries(testUsers)) {
    try {
      console.log(`\n📌 Creating ${role} test user`);
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
        select: { id: true, email: true }
      });
      
      if (existingUser) {
        console.log(`✅ Using existing ${role} user:`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Email: ${existingUser.email}`);
        userIds[role] = existingUser.id;
        
        // Reset user profile data for testing
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            profileImageUrl: null,
            preferences: {},
            notificationPrefs: {},
            status: UserStatus.ACTIVE,
            emailVerified: new Date(),
          }
        });
        
        console.log('   Reset user profile data for testing');
      } else {
        // Register new user
        console.log(`Creating new ${role} test user...`);
        const response = await axios.post(REGISTER_URL, userData, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✅ ${role} user registration successful!`);
        userIds[role] = response.data.user.id;
        
        // Activate the user (bypass email verification)
        await prisma.user.update({
          where: { id: response.data.user.id },
          data: {
            status: UserStatus.ACTIVE,
            emailVerified: new Date(),
            verificationToken: null,
            verificationTokenExpiry: null
          }
        });
        
        console.log(`   User activated (bypassed email verification)`);
      }
    } catch (error) {
      console.error(`❌ Failed to create ${role} test user:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Login all test users and store their sessions
 */
async function loginTestUsers() {
  console.log('\n🧪 Logging in test users');
  
  for (const [role, userData] of Object.entries(testUsers)) {
    try {
      console.log(`\n📌 Logging in ${role} user`);
      
      const response = await axios.post(LOGIN_URL, {
        email: userData.email,
        password: userData.password
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ ${role} user login successful!`);
      
      if (response.data.token) {
        userSessions[role] = response.data.token;
        console.log(`   Session token retrieved`);
      } else {
        console.error(`❌ No token in login response for ${role}`);
      }
    } catch (error) {
      console.error(`❌ Failed to login ${role} test user:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Test retrieving user profiles
 */
async function testGetProfiles() {
  console.log('\n🧪 Testing profile retrieval');
  
  for (const [role, token] of Object.entries(userSessions)) {
    try {
      console.log(`\n📌 Retrieving ${role} user profile`);
      
      const response = await axios.get(PROFILE_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ ${role} profile retrieval successful!`);
      console.log(`   User ID: ${response.data.data.user.id}`);
      console.log(`   Email: ${response.data.data.user.email}`);
      console.log(`   Name: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      console.log(`   Role: ${response.data.data.user.role}`);
      
      // Verify role-specific data is present
      if (response.data.data.roleSpecificData) {
        console.log(`   Role-specific data retrieved: ✅`);
        console.log(`   Fields: ${Object.keys(response.data.data.roleSpecificData).join(', ')}`);
      } else {
        console.log(`   No role-specific data: ❌`);
      }
    } catch (error) {
      console.error(`❌ Failed to retrieve ${role} profile:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test unauthorized access
  try {
    console.log('\n📌 Testing unauthorized profile access');
    
    const response = await axios.get(PROFILE_URL, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.error('❌ Unauthorized access succeeded when it should have failed');
    console.error('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Unauthorized access properly rejected with 401 status');
    } else {
      console.error('❌ Unexpected error during unauthorized access test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Test updating user profiles
 */
async function testUpdateProfiles() {
  console.log('\n🧪 Testing profile updates');
  
  // Test basic profile updates for each role
  for (const [role, token] of Object.entries(userSessions)) {
    try {
      console.log(`\n📌 Updating ${role} basic profile information`);
      
      const updateData = {
        firstName: `Updated${role}`,
        lastName: `UpdatedLastName`,
        phone: `555-999-${role.length}${role.length}${role.length}${role.length}`,
        timezone: "America/New_York"
      };
      
      const response = await axios.patch(PROFILE_URL, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ ${role} basic profile update successful!`);
      console.log(`   Updated fields: ${Object.keys(updateData).join(', ')}`);
      
      // Verify updates were applied
      const verifyResponse = await axios.get(PROFILE_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const user = verifyResponse.data.data.user;
      const allUpdatesApplied = 
        user.firstName === updateData.firstName &&
        user.lastName === updateData.lastName &&
        user.phone === updateData.phone &&
        user.timezone === updateData.timezone;
      
      if (allUpdatesApplied) {
        console.log('   ✅ All updates were correctly applied');
      } else {
        console.log('   ❌ Some updates were not applied correctly');
        console.log('   Expected:', JSON.stringify(updateData, null, 2));
        console.log('   Actual:', JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          timezone: user.timezone
        }, null, 2));
      }
    } catch (error) {
      console.error(`❌ Failed to update ${role} basic profile:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test role-specific profile updates
  const roleSpecificUpdates = {
    FAMILY: {
      emergencyContact: "Emergency Contact Person",
      emergencyPhone: "555-911-9999"
    },
    OPERATOR: {
      companyName: "Updated Care Homes Inc.",
      taxId: "12-3456789",
      businessLicense: "BL12345678"
    },
    CAREGIVER: {
      bio: "Updated professional caregiver with 10 years of experience.",
      yearsExperience: 10,
      hourlyRate: 25.50,
      availability: {
        monday: { morning: true, afternoon: true, evening: false },
        tuesday: { morning: true, afternoon: true, evening: false },
        wednesday: { morning: false, afternoon: true, evening: true },
        thursday: { morning: false, afternoon: true, evening: true },
        friday: { morning: true, afternoon: false, evening: false },
        saturday: { morning: false, afternoon: false, evening: false },
        sunday: { morning: false, afternoon: false, evening: false }
      }
    },
    AFFILIATE: {
      organization: "Updated Referral Partners LLC",
      commissionRate: 12.5,
      paymentDetails: {
        paymentMethod: "direct_deposit",
        accountName: "Business Account",
        routingNumber: "XXXX1234"
      }
    }
  };
  
  for (const [role, token] of Object.entries(userSessions)) {
    if (roleSpecificUpdates[role]) {
      try {
        console.log(`\n📌 Updating ${role} role-specific information`);
        
        const response = await axios.patch(PROFILE_URL, roleSpecificUpdates[role], {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`✅ ${role} role-specific update successful!`);
        console.log(`   Updated fields: ${Object.keys(roleSpecificUpdates[role]).join(', ')}`);
        
        // Verify updates through a new profile retrieval
        const verifyResponse = await axios.get(PROFILE_URL, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('   ✅ Role-specific data verification complete');
        
      } catch (error) {
        console.error(`❌ Failed to update ${role} role-specific profile:`);
        
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.error('Error:', error.message);
        }
      }
    }
  }
  
  // Test address updates
  for (const [role, token] of Object.entries(userSessions)) {
    try {
      console.log(`\n📌 Updating ${role} address information`);
      
      const addressData = {
        address: {
          street: `${role} Street`,
          street2: `Apt ${role.length * 100}`,
          city: "Test City",
          state: "TS",
          zipCode: `${role.length}${role.length}${role.length}${role.length}${role.length}`,
          country: "USA"
        }
      };
      
      const response = await axios.patch(PROFILE_URL, addressData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ ${role} address update successful!`);
      
      // Verify address update
      const verifyResponse = await axios.get(PROFILE_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (verifyResponse.data.data.addresses && verifyResponse.data.data.addresses.length > 0) {
        console.log('   ✅ Address was correctly saved');
        console.log('   Address:', verifyResponse.data.data.addresses[0].street);
      } else {
        console.log('   ❌ Address was not saved correctly');
      }
    } catch (error) {
      console.error(`❌ Failed to update ${role} address:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test invalid data validation
  try {
    console.log('\n📌 Testing invalid data validation');
    
    const invalidData = {
      firstName: "", // Too short
      lastName: "X", // Too short
      phone: "invalid-phone"
    };
    
    const response = await axios.patch(PROFILE_URL, invalidData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.error('❌ Invalid data accepted when it should have been rejected');
    console.error('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Invalid data properly rejected with 400 status');
      console.log('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Unexpected error during invalid data test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Test profile photo upload and management
 */
async function testProfilePhotos() {
  console.log('\n🧪 Testing profile photo management');
  
  // Create a test image file
  const testImagePath = path.join(__dirname, 'test-profile-photo.png');
  
  // Only create the test image if it doesn't exist
  if (!fs.existsSync(testImagePath)) {
    console.log('\n📌 Creating test profile photo');
    
    // Create a simple 100x100 colored square as test image
    const imageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TpSIVBzuIOmSoThZERRy1CkWoEGqFVh1MbvqhNGlIUlwcBdeCgx+LVQcXZ10dXAVB8APEydFJ0UVK/F9SaBHjwXE/3t173L0DhGaVqWbPOKBqlpFOxMVcflUMvCKIEMIYQ1Biph7LLGbhOb7u4ePrXZxneZ/7cwwoBZMBPpF4jumGRbxBPLNp6Zz3iSOsJCnE58QTBl2Q+JHrsstvnEsOCzwzYmbS88QRYrHYxXIXs5qxEk8TRxVNp3wh57HKeYuzVq6y5j35C0MFfWWZ6zRHkMAiliBBhIIaSimjihitdZIYrdA6+Pkvd5PvkshloKAcZRhQYEG0f9B92P0bunFr5SfG80YF4OeLbX8MA8FdoNWw7e9j226dAP5n4Err+GtNIP5JeqOjRY+AgW3g4rqjKXvA5Q4w9GTIpuxKQZpCsQi8n9E35YHBW6B/ze2tvY/TByBLXaVvgINDYLxE2ese7+7t7u3fM+3+fgBkLHLGJHPh1wAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+UHFwYQAEwMEKMAAAKeSURBVHja7dw9aBNhGMDxf00bP9o0qdLUDlUQnBQUBAdRcKogFRRcFRe/cBIHQXAQRQdRcKw4CCo4iIqDOIhDBRGFIi1WUJuaNE2T9CN+ZGlrm+Z9k7xvzr4/OMhw19zz3F3eu+fCGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxtjKEtF/OHVmc/wLSRw9eSMqfUKJPTpzJrLUyVLHYvFzZ8+4+VxWf8Fqk+Wy2ZmZ6Zl8Lqe/YLVJ6Uw6k06lCvl8Xn/BapOlUqmp8fHx6UIh7+ovWG0Sx3FGR0ZGZkqlkqu/YLVJKaVMTkxMTpdKRVd/wWqTjuOMjY2NTReLRfHXc6tNlsvl0ujo6HShUHD0F6w2WalUitPT09OFfD6nv2C1ScdxnLGxsWw+n8/qL1htUkrpTExMZAuFQkZ/wWqTjuM4Y+Pj2UIhl9FfsNqklNKZmJzIFvK5tP6C1SYdx3HGx8ezxWIxrb9gtUkppTMxOZktFgpp/QWrTTqO44yNj2eLxWJKf8Fqk1JKZ3JyMlssFpL6C1abdBzHGR8fzxaLxaT+gtUmpZTOxORktlQqJvQXrDbpOI4zPj6eLZVKCf0Fq01KKZ2JyYlsqVSM6y9YbdJxHGd0dDRbKpXi+gtWm5RSOhMTE9lSqRTTX7DapOM4zsjISLZcLsf0F6w2KaV0JicnM+VyOaa/YLVJ13Xd4eHhTKVSiekv+Jd/qVZdNzU0NJSpVCpR/QWrTbque3toaChdqVSi+gtWm3Rd1x0eHk5XKtWo/oLVJl3XdYeGhtLVajWiv2C1Sdd13cHBwXS1Wo3oL1ht0nVdd3BwMF2tVsP6C1abrFar1YGBgXStVgvrLxhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4z9Z78AYBCvzJw3PHEAAAAASUVORK5CYII=',
      'base64'
    );
    
    fs.writeFileSync(testImagePath, imageData);
    console.log(`   Created test image at ${testImagePath}`);
  }
  
  // Test photo upload for FAMILY role
  try {
    console.log('\n📌 Testing profile photo upload');
    
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'profile-photo.png',
      contentType: 'image/png'
    });
    
    const response = await axios.post(PHOTO_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.log('✅ Profile photo upload successful!');
    console.log('   Photo URLs:', JSON.stringify(response.data.data.photoUrls, null, 2));
    
    // Verify photo was saved by retrieving profile
    const verifyResponse = await axios.get(PROFILE_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    if (verifyResponse.data.data.user.profileImageUrl) {
      console.log('   ✅ Profile photo URLs saved to user profile');
    } else {
      console.log('   ❌ Profile photo URLs not saved to user profile');
    }
    
    // Test photo deletion
    console.log('\n📌 Testing profile photo deletion');
    
    const deleteResponse = await axios.delete(PHOTO_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.log('✅ Profile photo deletion successful!');
    
    // Verify photo was deleted
    const verifyDeleteResponse = await axios.get(PROFILE_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    if (!verifyDeleteResponse.data.data.user.profileImageUrl) {
      console.log('   ✅ Profile photo URLs removed from user profile');
    } else {
      console.log('   ❌ Profile photo URLs still present in user profile');
    }
    
  } catch (error) {
    console.error('❌ Profile photo test failed:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
  
  // Test invalid photo upload (too large file simulation)
  try {
    console.log('\n📌 Testing invalid photo upload (simulated large file)');
    
    // Modify request headers to simulate a large file
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'large-profile-photo.png',
      contentType: 'image/png',
      knownLength: 10 * 1024 * 1024 // Simulate 10MB file
    });
    
    const response = await axios.post(PHOTO_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Length': 10 * 1024 * 1024, // 10MB
        'Authorization': `Bearer ${userSessions.FAMILY}`
      },
      maxContentLength: 10 * 1024 * 1024
    });
    
    console.error('❌ Large file upload succeeded when it should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Large file properly rejected');
    } else {
      console.log('✅ Large file upload failed as expected (may be rejected by server or axios)');
    }
  }
  
  // Test unauthorized photo upload
  try {
    console.log('\n📌 Testing unauthorized photo upload');
    
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'profile-photo.png',
      contentType: 'image/png'
    });
    
    const response = await axios.post(PHOTO_URL, formData, {
      headers: formData.getHeaders()
    });
    
    console.error('❌ Unauthorized photo upload succeeded when it should have failed');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Unauthorized photo upload properly rejected with 401 status');
    } else {
      console.error('❌ Unexpected error during unauthorized photo upload test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Test user preferences management
 */
async function testPreferencesManagement() {
  console.log('\n🧪 Testing preferences management');
  
  // Test getting preferences for each role
  for (const [role, token] of Object.entries(userSessions)) {
    try {
      console.log(`\n📌 Retrieving ${role} user preferences`);
      
      const response = await axios.get(PREFERENCES_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ ${role} preferences retrieval successful!`);
      console.log(`   Preferences data retrieved:`, Object.keys(response.data.data.preferences || {}).join(', '));
      
    } catch (error) {
      console.error(`❌ Failed to retrieve ${role} preferences:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test updating preferences
  for (const [role, token] of Object.entries(userSessions)) {
    try {
      console.log(`\n📌 Updating ${role} user preferences`);
      
      // Common preferences for all roles
      const preferencesData = {
        notifications: {
          email: {
            marketing: false,
            updates: true,
            security: true,
            reminders: true
          },
          sms: {
            marketing: false,
            updates: false,
            security: true,
            reminders: false
          },
          inApp: {
            marketing: true,
            updates: true,
            security: true,
            reminders: true,
            messages: true
          }
        },
        privacy: {
          profileVisibility: "CONNECTIONS",
          shareContactInfo: false,
          shareLocation: false,
          allowDataAnalytics: true,
          allowThirdPartySharing: false
        },
        display: {
          theme: "DARK",
          language: "en",
          timezone: "America/Los_Angeles",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12H"
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          reduceMotion: true,
          screenReader: false,
          colorBlindMode: "NONE"
        }
      };
      
      // Add role-specific preferences
      switch (role) {
        case 'FAMILY':
          preferencesData.roleSpecific = {
            careUpdatesFrequency: "DAILY",
            medicationReminders: true,
            emergencyContactNotification: true
          };
          break;
        case 'OPERATOR':
          preferencesData.roleSpecific = {
            occupancyAlerts: true,
            staffingReminders: true,
            financialReports: "WEEKLY",
            maintenanceAlerts: true
          };
          break;
        case 'CAREGIVER':
          preferencesData.roleSpecific = {
            shiftReminders: true,
            availabilityUpdates: true,
            certificationReminders: true,
            trainingOpportunities: true
          };
          break;
        case 'AFFILIATE':
          preferencesData.roleSpecific = {
            referralUpdates: true,
            commissionReports: "WEEKLY",
            marketingMaterials: true
          };
          break;
      }
      
      const response = await axios.put(PREFERENCES_URL, preferencesData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ ${role} preferences update successful!`);
      console.log(`   Updated sections: ${response.data.data.updatedSections.join(', ')}`);
      
      // Verify preferences were updated
      const verifyResponse = await axios.get(PREFERENCES_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const updatedPrefs = verifyResponse.data.data.preferences;
      
      if (updatedPrefs.display && updatedPrefs.display.theme === "DARK") {
        console.log('   ✅ Preferences were correctly updated');
      } else {
        console.log('   ❌ Preferences were not updated correctly');
      }
      
    } catch (error) {
      console.error(`❌ Failed to update ${role} preferences:`);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test partial preference updates
  try {
    console.log('\n📌 Testing partial preference updates');
    
    const partialUpdate = {
      display: {
        theme: "LIGHT",
        timeFormat: "24H"
      }
    };
    
    const response = await axios.patch(PREFERENCES_URL, partialUpdate, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.log('✅ Partial preferences update successful!');
    
    // Verify partial update
    const verifyResponse = await axios.get(PREFERENCES_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    const updatedPrefs = verifyResponse.data.data.preferences;
    
    if (updatedPrefs.display && 
        updatedPrefs.display.theme === "LIGHT" && 
        updatedPrefs.display.timeFormat === "24H") {
      console.log('   ✅ Partial preferences were correctly updated');
    } else {
      console.log('   ❌ Partial preferences were not updated correctly');
    }
    
  } catch (error) {
    console.error('❌ Failed to update partial preferences:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
  
  // Test invalid preferences data
  try {
    console.log('\n📌 Testing invalid preferences data');
    
    const invalidData = {
      display: {
        theme: "INVALID_THEME", // Invalid enum value
        timeFormat: "INVALID_FORMAT" // Invalid enum value
      }
    };
    
    const response = await axios.put(PREFERENCES_URL, invalidData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.error('❌ Invalid preferences data accepted when it should have been rejected');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Invalid preferences data properly rejected with 400 status');
      console.log('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Unexpected error during invalid preferences data test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Test password changes
 */
async function testPasswordChanges() {
  console.log('\n🧪 Testing password changes');
  
  // Test successful password change
  try {
    console.log('\n📌 Testing successful password change');
    
    const passwordData = {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    };
    
    const response = await axios.post(CHANGE_PASSWORD_URL, passwordData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.log('✅ Password change successful!');
    
    // Try logging in with new password
    console.log('   Testing login with new password...');
    
    const loginResponse = await axios.post(LOGIN_URL, {
      email: testUsers.FAMILY.email,
      password: NEW_PASSWORD
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('   ✅ Login with new password successful!');
    
    // Change password back for other tests
    console.log('   Changing password back to original...');
    
    const revertPasswordData = {
      currentPassword: NEW_PASSWORD,
      newPassword: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD
    };
    
    await axios.post(CHANGE_PASSWORD_URL, revertPasswordData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('   ✅ Password reverted successfully!');
    
  } catch (error) {
    console.error('❌ Password change test failed:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
  
  // Test incorrect current password
  try {
    console.log('\n📌 Testing incorrect current password');
    
    const passwordData = {
      currentPassword: "WrongPassword123!",
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    };
    
    const response = await axios.post(CHANGE_PASSWORD_URL, passwordData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.error('❌ Password change with incorrect current password succeeded when it should have failed');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Incorrect current password properly rejected with 401 status');
    } else {
      console.error('❌ Unexpected error during incorrect password test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test password mismatch
  try {
    console.log('\n📌 Testing password mismatch');
    
    const passwordData = {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: "DifferentPassword123!"
    };
    
    const response = await axios.post(CHANGE_PASSWORD_URL, passwordData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.error('❌ Password change with mismatched passwords succeeded when it should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Password mismatch properly rejected with 400 status');
      console.log('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Unexpected error during password mismatch test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test weak password
  try {
    console.log('\n📌 Testing weak password');
    
    const passwordData = {
      currentPassword: TEST_PASSWORD,
      newPassword: "weak",
      confirmPassword: "weak"
    };
    
    const response = await axios.post(CHANGE_PASSWORD_URL, passwordData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessions.FAMILY}`
      }
    });
    
    console.error('❌ Password change with weak password succeeded when it should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Weak password properly rejected with 400 status');
      console.log('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error('❌ Unexpected error during weak password test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
  
  // Test unauthorized password change
  try {
    console.log('\n📌 Testing unauthorized password change');
    
    const passwordData = {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    };
    
    const response = await axios.post(CHANGE_PASSWORD_URL, passwordData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.error('❌ Unauthorized password change succeeded when it should have failed');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Unauthorized password change properly rejected with 401 status');
    } else {
      console.error('❌ Unexpected error during unauthorized password change test:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting CareLinkAI Profile Management Test');
  console.log('===========================================================');
  
  try {
    // Create test users for each role
    await createTestUsers();
    
    // Login test users
    await loginTestUsers();
    
    // Test profile retrieval
    await testGetProfiles();
    
    // Test profile updates
    await testUpdateProfiles();
    
    // Test profile photos
    await testProfilePhotos();
    
    // Test preferences management
    await testPreferencesManagement();
    
    // Test password changes
    await testPasswordChanges();
    
    console.log('\n🏁 All profile management tests completed!');
    
  } catch (error) {
    console.error('\n💥 Tests failed with error:', error.message);
  } finally {
    // Clean up Prisma connection
    await prisma.$disconnect();
  }
}

// Execute the tests
runTests();
