/**
 * Two-Factor Authentication Service for CareLinkAI
 * 
 * Provides TOTP (Time-based One-Time Password) functionality:
 * - Secret generation
 * - QR code creation for authenticator apps
 * - TOTP code verification
 * 
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator,
 * and other TOTP-compliant authenticator apps.
 * 
 * Implements RFC 6238 (TOTP) and RFC 4226 (HOTP) standards.
 */

import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

// Constants
const ISSUER = 'CareLinkAI';
const DIGITS = 6; // Standard 6-digit codes
const PERIOD = 30; // 30-second validity period
const WINDOW = 1; // Allow 1 step before/after for clock drift (±30 sec)

/**
 * Two-Factor Authentication Service
 */
export class TwoFactorService {
  constructor() {
    // Configure authenticator
    authenticator.options = {
      digits: DIGITS,
      period: PERIOD,
      window: WINDOW,
    };
  }

  /**
   * Generate a new TOTP secret for a user
   * 
   * @param userId User identifier
   * @returns Object containing secret and QR code URL
   */
  async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    // Generate a secure random secret
    const secret = authenticator.generateSecret();
    // Create a label for the authenticator app
    const label = encodeURIComponent(`${ISSUER}:${userId}`);
    
    // Generate the otpauth URL
    const otpauthUrl = authenticator.keyuri(userId, ISSUER, secret);
    
    // Generate QR code as data URL
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'H', // High error correction for better scanning
      margin: 4,
      width: 256,
      color: {
        dark: '#0099e6', // Primary brand color
        light: '#ffffff',
      },
    });
    
    return { secret, qrCodeUrl };
  }

  /**
   * Verify a TOTP code against a secret
   * 
   * @param secret User's TOTP secret
   * @param token Code entered by the user
   * @returns Whether the code is valid
   */
  async verifyCode(secret: string, token: string): Promise<boolean> {
    try {
      // Clean the token (remove spaces, etc.)
      const cleanToken = token.replace(/\s+/g, '');
      
      // Verify the token
      return authenticator.verify({ token: cleanToken, secret });
    } catch (error) {
      console.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  /**
   * Generate a current TOTP code for a secret
   * Primarily used for testing
   * 
   * @param secret TOTP secret
   * @returns Current valid TOTP code
   */
  generateCode(secret: string): string {
    return authenticator.generate(secret);
  }

  /**
   * Generate recovery codes for a user
   * These can be used if the user loses access to their authenticator device
   * 
   * @param count Number of recovery codes to generate
   * @returns Array of recovery codes
   */
  generateRecoveryCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate a random code with 4 groups of 4 alphanumeric characters
      const code = Array.from({ length: 4 }, () => 
        crypto.randomBytes(2).toString('hex').toUpperCase()
      ).join('-');
      
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Encrypt a TOTP secret for secure storage
   * 
   * @param secret Plain text secret
   * @param encryptionKey Encryption key
   * @returns Encrypted secret
   */
  encryptSecret(secret: string, encryptionKey: string): string {
    // Use AES-256-GCM for authenticated encryption
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the secret
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag for storage
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  }

  /**
   * Decrypt a TOTP secret
   * 
   * @param encryptedSecret Encrypted secret
   * @param encryptionKey Encryption key
   * @returns Decrypted secret
   */
  decryptSecret(encryptedSecret: string, encryptionKey: string): string {
    try {
      // Split the stored data
      const [ivHex, encrypted, authTagHex] = encryptedSecret.split(':');
      if (!ivHex || !encrypted || !authTagHex) {
        throw new Error('Invalid encrypted secret format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Create the decipher
      const key = crypto.createHash('sha256').update(encryptionKey).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the secret
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting TOTP secret:', error);
      throw new Error('Failed to decrypt TOTP secret');
    }
  }

  /**
   * Check if a TOTP secret is valid
   * 
   * @param secret Secret to validate
   * @returns Whether the secret is valid
   */
  isValidSecret(secret: string): boolean {
    try {
      // Attempt to generate a code - will throw if secret is invalid
      authenticator.generate(secret);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Generate a backup code hash for secure storage
 * 
 * @param code Plain text backup code
 * @returns Hashed backup code
 */
export async function hashBackupCode(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use PBKDF2 with a random salt
    const salt = crypto.randomBytes(16);
    
    crypto.pbkdf2(code, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      
      // Format as salt:hash
      resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify a backup code against its hash
 * 
 * @param code Plain text backup code
 * @param hash Hashed backup code
 * @returns Whether the code is valid
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Split the hash into salt and hash
    const [saltHex, keyHex] = hash.split(':');
    if (!saltHex || !keyHex) {
      resolve(false);
      return;
    }
    
    // Hash the provided code with the same salt
    crypto.pbkdf2(code, Buffer.from(saltHex, 'hex'), 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      
      // Compare the hashes
      resolve(keyHex === derivedKey.toString('hex'));
    });
  });
}
