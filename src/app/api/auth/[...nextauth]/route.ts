/**
 * NextAuth API Route Handler for CareLinkAI
 * 
 * This file sets up the NextAuth.js API routes for authentication:
 * - GET endpoint for session validation and CSRF protection
 * - POST endpoint for authentication operations (sign in, sign out)
 * 
 * The route uses the authOptions configuration from @/lib/auth
 */

import NextAuth from "next-auth";
// Database-backed authentication
// -------------------------------------------------------------
// The PostgreSQL credentials have been updated and verified
// (password: `secure_password_change_me`).  We can safely switch
// back to the primary database authentication strategy.
// -------------------------------------------------------------
import authOptions from "@/lib/auth";

// Create handler with our custom authOptions
const handler = NextAuth(authOptions);

// Export GET and POST handlers for Next.js App Router
export { handler as GET, handler as POST };
