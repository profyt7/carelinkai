/**
 * Simplified NextAuth Configuration for CareLinkAI
 * 
 * This is a temporary configuration that uses in-memory user data
 * for testing the login UI without requiring a database connection.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { UserRole, UserStatus } from "@prisma/client";

// Mock user data for testing (matches our seeded users)
const mockUsers = [
  {
    id: "admin-user-id",
    email: "admin@carelinkai.com",
    firstName: "Admin",
    lastName: "User",
    // bcrypt hash for password: Admin123!
    passwordHash: "$2a$10$xkHTgjMKffgFWac2D8U1yOHtTujItUGvAnW3H8j.MQy1QONHC0biS",
    role: "ADMIN" as UserRole,
    status: "ACTIVE" as UserStatus,
    phone: "555-123-4567",
    lastLoginAt: new Date(),
    twoFactorEnabled: false,
    twoFactorSecret: null,
  },
  {
    id: "operator-user-id",
    email: "operator@carelinkai.com",
    firstName: "John",
    lastName: "Operator",
    // bcrypt hash for password: Admin123!
    passwordHash: "$2a$10$xkHTgjMKffgFWac2D8U1yOHtTujItUGvAnW3H8j.MQy1QONHC0biS",
    role: "OPERATOR" as UserRole,
    status: "ACTIVE" as UserStatus,
    phone: "555-987-6543",
    lastLoginAt: new Date(),
    twoFactorEnabled: false,
    twoFactorSecret: null,
  }
];

// Constants for security settings
const JWT_MAX_AGE = parseInt(process.env['JWT_EXPIRATION'] || '86400'); // 24 hours in seconds
const SESSION_MAX_AGE = parseInt(process.env['SESSION_EXPIRY'] || '86400'); // 24 hours in seconds

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  // Configure providers
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Normalize email to lowercase
        const email = credentials.email.toLowerCase();
        
        // Find user by email in mock data
        const user = mockUsers.find(u => u.email.toLowerCase() === email);

        // User not found
        if (!user) {
          console.log("User not found:", email);
          throw new Error("Invalid email or password");
        }

        // Check if account is suspended
        if (user.status === UserStatus.SUSPENDED) {
          console.log("Account suspended:", email);
          throw new Error("Your account has been suspended. Please contact support.");
        }

        // Verify password
        const passwordValid = await compare(credentials.password, user.passwordHash);
        if (!passwordValid) {
          console.log("Invalid password for:", email);
          throw new Error("Invalid email or password");
        }

        console.log("Login successful for:", email);
        
        // Return user object without sensitive data
        return ({
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
        } as any);
      },
    }),
  ],
  
  // Configure session handling
  session: {
    strategy: "jwt", // Use JWT for session handling
    maxAge: SESSION_MAX_AGE, // How long session lasts
  },
  
  // Configure JWT
  jwt: {
    maxAge: JWT_MAX_AGE, // How long JWT tokens last
  },
  
  // Pages configuration
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
  
  // Callbacks
  callbacks: {
    // JWT callback to customize token content
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
      }
      
      return token;
    },
    
    // Session callback to pass data to client
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.email = token.email as string;
      }
      
      return session;
    },
    
    // Redirect callback for custom redirect logic
    async redirect({ url, baseUrl }) {
      /* -----------------------------------------------------------------
       * Custom redirect logic
       * 1.   After a successful login NextAuth may try to redirect back to
       *      the sign-in page – we never want that (loop).  Send to /dashboard
       *      instead.
       * 2.   Preserve fully-qualified URLs that already match `baseUrl`.
       * 3.   Allow relative URLs by prefixing with `baseUrl`.
       * 4.   Fallback to `baseUrl`.
       * ---------------------------------------------------------------- */

      // 1) Prevent redirect loops back to any auth route
      if (url.startsWith("/auth")) {
        return `${baseUrl}/dashboard`;
      }

      // 2) Same-origin absolute URL – leave untouched
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // 3) Relative URL – prefix with baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // 4) Default fallback
      return baseUrl;
    },
  },
  
  // Debug mode (enable for development)
  debug: process.env['NODE_ENV'] === 'development',
};
