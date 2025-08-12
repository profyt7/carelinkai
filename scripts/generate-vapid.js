#!/usr/bin/env node

/**
 * CareLink AI - VAPID Key Generator
 * 
 * This script generates VAPID keys for web push notifications
 * using the Node.js crypto module instead of relying on web-push.
 * 
 * Usage: node generate-vapid.js
 * 
 * Output: Public and private keys in URL-safe base64 format
 * suitable for use in .env.local file for push notifications.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Convert a buffer to URL-safe base64 string
 * This is the format required for VAPID keys
 */
function toUrlSafeBase64(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate VAPID keys using crypto module
 */
async function generateVapidKeys() {
  console.log(`\n${COLORS.cyan}${COLORS.bright}CareLink AI - VAPID Key Generator${COLORS.reset}`);
  console.log(`${COLORS.yellow}Generating VAPID keys for push notifications...${COLORS.reset}\n`);
  
  try {
    // Generate an EC key pair using the P-256 curve (appropriate for VAPID)
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // P-256 curve
      publicKeyEncoding: {
        type: 'spki',
        format: 'der'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der'
      }
    });
    
    // Convert keys to URL-safe base64
    const publicKeyBase64 = toUrlSafeBase64(publicKey);
    const privateKeyBase64 = toUrlSafeBase64(privateKey);
    
    // Output the keys
    console.log(`${COLORS.green}VAPID keys generated successfully!${COLORS.reset}\n`);
    console.log(`${COLORS.bright}Public Key:${COLORS.reset}`);
    console.log(publicKeyBase64);
    console.log(`\n${COLORS.bright}Private Key:${COLORS.reset}`);
    console.log(privateKeyBase64);
    
    // Create .env variables format
    const envVars = `
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyBase64}
VAPID_PRIVATE_KEY=${privateKeyBase64}
VAPID_SUBJECT=mailto:support@carelinkai.com
`;
    
    console.log(`\n${COLORS.bright}Add these to your .env.local file:${COLORS.reset}`);
    console.log(envVars);
    
    // Offer to update .env.local file
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      console.log(`\n${COLORS.yellow}Found .env.local file. You can manually add the keys above.${COLORS.reset}`);
      console.log(`${COLORS.yellow}Or run: node scripts/generate-vapid.js --update-env${COLORS.reset}`);
    } else {
      console.log(`\n${COLORS.yellow}No .env.local file found. Create one and add the keys above.${COLORS.reset}`);
    }
    
    // If --update-env flag is provided, update the .env.local file
    if (process.argv.includes('--update-env')) {
      updateEnvFile(envPath, publicKeyBase64, privateKeyBase64);
    }
    
    // Return the keys
    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64
    };
  } catch (error) {
    console.error(`\nError generating VAPID keys: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Update .env.local file with VAPID keys
 */
function updateEnvFile(envPath, publicKey, privateKey) {
  try {
    let envContent = '';
    
    // Read existing .env.local file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove existing VAPID keys
      envContent = envContent
        .replace(/NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*\n/g, '')
        .replace(/VAPID_PRIVATE_KEY=.*\n/g, '')
        .replace(/VAPID_SUBJECT=.*\n/g, '');
    }
    
    // Add new VAPID keys
    envContent += `
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:support@carelinkai.com
`;
    
    // Write to .env.local file
    fs.writeFileSync(envPath, envContent);
    console.log(`\n${COLORS.green}Updated .env.local file with VAPID keys${COLORS.reset}`);
  } catch (error) {
    console.error(`\nError updating .env.local file: ${error.message}`);
  }
}

// If script is run directly, generate keys
if (require.main === module) {
  generateVapidKeys();
}

// Export for use in other scripts
module.exports = { generateVapidKeys };
