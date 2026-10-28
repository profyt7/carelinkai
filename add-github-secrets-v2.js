const https = require('https');
const sodium = require('libsodium-wrappers');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'profyt7';
const REPO_NAME = 'carelinkai';

// Function to make GitHub API request
function githubRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Function to encrypt secret using libsodium
async function encryptSecret(publicKey, secretValue) {
  await sodium.ready;
  
  // Convert the base64 public key to a Uint8Array
  const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  
  // Convert secret to Uint8Array
  const messageBytes = sodium.from_string(secretValue);
  
  // Encrypt using sealed box
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
  
  // Convert to base64
  return sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);
}

// Main function
async function addSecrets() {
  try {
    console.log('🔐 Getting repository public key...');
    
    // Get repository public key
    const publicKeyData = await githubRequest(
      'GET',
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key`
    );
    
    console.log('✅ Public key retrieved');
    console.log(`   Key ID: ${publicKeyData.key_id}`);
    console.log('');
    
    // Read secrets from environment
    const E2E_NEXTAUTH_SECRET = process.env.E2E_NEXTAUTH_SECRET;
    const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;
    
    // Add E2E_NEXTAUTH_SECRET
    console.log('🔐 Adding E2E_NEXTAUTH_SECRET...');
    const encryptedNextAuthSecret = await encryptSecret(publicKeyData.key, E2E_NEXTAUTH_SECRET);
    
    await githubRequest(
      'PUT',
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/E2E_NEXTAUTH_SECRET`,
      {
        encrypted_value: encryptedNextAuthSecret,
        key_id: publicKeyData.key_id
      }
    );
    
    console.log('✅ E2E_NEXTAUTH_SECRET added successfully');
    console.log('');
    
    // Add E2E_DATABASE_URL
    console.log('🔐 Adding E2E_DATABASE_URL...');
    const encryptedDatabaseUrl = await encryptSecret(publicKeyData.key, E2E_DATABASE_URL);
    
    await githubRequest(
      'PUT',
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/E2E_DATABASE_URL`,
      {
        encrypted_value: encryptedDatabaseUrl,
        key_id: publicKeyData.key_id
      }
    );
    
    console.log('✅ E2E_DATABASE_URL added successfully');
    console.log('');
    
    console.log('🎉 All secrets added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSecrets();
