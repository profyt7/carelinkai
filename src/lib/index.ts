/**
 * Library Index File
 * 
 * This file re-exports functions from other library files to make imports cleaner.
 * Instead of importing from specific files, you can import from '@/lib'
 */

// Re-export all email functions
export {
  generateToken,
  generateTokenExpiry,
  createVerificationToken,
  createPasswordResetToken,
  verifyEmailToken,
  sendVerificationEmail,
  resendVerificationEmail,
  initializeEmailService
} from './email';

// Re-export the default email service
export { default as emailService } from './email';
