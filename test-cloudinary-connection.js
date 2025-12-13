#!/usr/bin/env node

/**
 * Cloudinary Connection Test Script
 * Tests connection with the corrected cloud name
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with corrected credentials
cloudinary.config({
  cloud_name: 'dygtsnu8z',
  api_key: '328392542172231',
  api_secret: 'KhpohAEFOsjVKuXRENaBhCoIYFQ'
});

console.log('🔍 Testing Cloudinary Connection...\n');
console.log('Configuration:');
console.log('  Cloud Name: dygtsnu8z');
console.log('  API Key: 328392542172231');
console.log('  API Secret: KhpohAEFOsjVKuXRENaBhCoIYFQ\n');

// Test the connection
cloudinary.api.ping()
  .then(result => {
    console.log('✅ SUCCESS: Cloudinary connection is working!');
    console.log('Response:', result);
    console.log('\n✅ Cloud name correction successful!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ ERROR: Cloudinary connection failed!');
    console.error('Error details:', err);
    console.error('\n❌ Please verify credentials in Cloudinary dashboard');
    process.exit(1);
  });
