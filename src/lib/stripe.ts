import Stripe from 'stripe';

// Latest supported API version
const STRIPE_API_VERSION = '2023-10-16';

// Dummy key for development when no real key is provided
// This follows the pattern of test keys but will never work for real API calls
const DUMMY_KEY = 'sk_test_dummy_key_for_development_only';

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Initialize Stripe with proper error handling for missing keys
 */
function initializeStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    if (isProduction) {
      throw new Error(
        'STRIPE_SECRET_KEY is missing. Please add it to your environment variables.'
      );
    } else {
      console.warn(
        '\x1b[33m%s\x1b[0m', // Yellow text
        'WARNING: STRIPE_SECRET_KEY is missing. Using dummy key for development. ' +
        'Real Stripe API calls will fail. Set the key in .env.local to use Stripe.'
      );
      return new Stripe(DUMMY_KEY, {
        apiVersion: STRIPE_API_VERSION,
      });
    }
  }
  
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    // Recommended settings for better error handling
    typescript: true,
  });
}

// Create singleton instance
let stripeInstance: Stripe | null = null;

/**
 * Returns a singleton Stripe instance
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = initializeStripe();
  }
  return stripeInstance;
}

// Export singleton directly for convenience
export const stripe = getStripe();

/**
 * Reset the Stripe instance (useful for testing)
 */
export function resetStripe(): void {
  stripeInstance = null;
}
