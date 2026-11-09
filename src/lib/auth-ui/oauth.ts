/**
 * Google / Apple sign-in is not configured (src/lib/auth.ts has only the credentials
 * provider), so the buttons are hidden. Set NEXT_PUBLIC_OAUTH_SIGNIN_ENABLED=true at
 * build time, after adding the providers, to show them again.
 */
export const OAUTH_SIGNIN_ENABLED = process.env.NEXT_PUBLIC_OAUTH_SIGNIN_ENABLED === 'true';
