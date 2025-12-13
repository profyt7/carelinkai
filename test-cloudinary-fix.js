const cloudinary = require('cloudinary').v2;

// Configure with CORRECTED credentials (G instead of O)
cloudinary.config({
  cloud_name: 'dygtsnu8z',
  api_key: '328392542172231',
  api_secret: 'KhpohAEFGsjVKuXRENaBhCoIYFQ'  // Changed O to G
});

console.log('🔍 Testing Cloudinary connection with CORRECTED API Secret...');
console.log('   API Secret: KhpohAEFGsjVKuXRENaBhCoIYFQ (with G)');
console.log('');

cloudinary.api.ping()
  .then(result => {
    console.log('✅ SUCCESS! Cloudinary connection is working!');
    console.log('Response:', result);
    console.log('');
    console.log('🎉 The API Secret fix worked! The 401 error is resolved.');
  })
  .catch(err => {
    console.error('❌ ERROR: Cloudinary connection failed');
    console.error('Status:', err.http_code);
    console.error('Message:', err.message);
    console.error('');
    if (err.http_code === 401) {
      console.error('⚠️  Still getting 401 error. Please verify:');
      console.error('   1. Cloud Name is exactly: dygtsnu8z');
      console.error('   2. API Key is exactly: 328392542172231');
      console.error('   3. API Secret is exactly: KhpohAEFGsjVKuXRENaBhCoIYFQ');
      console.error('   4. Check Cloudinary dashboard for correct credentials');
    }
    process.exit(1);
  });
