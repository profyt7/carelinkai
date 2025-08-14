/**
 * Simplified Database-Backed NextAuth Configuration for CareLinkAI
 * 
 * This is a simplified version of the auth configuration that uses the database
 * but removes complex features like audit logging and 2FA to ensure basic
 * authentication works reliably.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { compare } from "bcryptjs";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants for security settings
const JWT_MAX_AGE = parseInt(process.env.JWT_EXPIRATION || "86400"); // 24 hours in seconds
const SESSION_MAX_AGE = parseInt(process.env.SESSION_EXPIRY || "86400"); // 24 hours in seconds

/**
 * NextAuth configuration options - simplified for reliable database auth
 */
export const authOptions: NextAuthOptions = {
  // Configure providers
  providers: [
    /* --------------------------------------------
     * Google OAuth (enabled only if env vars exist)
     * ------------------------------------------ */
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    /* --------------------------------------------
     * Apple OAuth (enabled only if env vars exist)
     * ------------------------------------------ */
    ...(process.env.APPLE_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PRIVATE_KEY &&
    process.env.APPLE_KEY_ID
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID!,
            clientSecret: {
              appleId: process.env.APPLE_ID!,
              teamId: process.env.APPLE_TEAM_ID!,
              privateKey: process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
              keyId: process.env.APPLE_KEY_ID!,
            },
          }),
        ]
      : []),

    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Normalize email to lowercase
        const email = credentials.email.toLowerCase();
        
        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

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

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          console.log("Login successful for:", email);
          
          // Return user object without sensitive data
          return {
            id: user.id,
            profileImageUrl: user.profileImageUrl ?? null,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error(error instanceof Error ? error.message : "Authentication failed");
        }
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
      /* ---------- DEBUG ---------- */
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[auth] JWT callback – phase:",
          user ? "initial-signin" : "refresh",
          "\n current token.profileImageUrl:",
          token.profileImageUrl
        );
      }
      // 1) Initial sign-in: copy data from `user` object.
      if (user) {
        token.id = user.id;
        token.profileImageUrl = (user as any).profileImageUrl ?? null;
        token.role = user.role;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        return token;
      }

      // 2) Subsequent calls: fetch fresh data using token.id
      try {
        if (token.id) {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              profileImageUrl: true,
              role: true,
              status: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          });

          if (freshUser) {
            token.profileImageUrl = freshUser.profileImageUrl ?? null;
            token.role = freshUser.role;
            token.status = freshUser.status;
            token.firstName = freshUser.firstName;
            token.lastName = freshUser.lastName;
            token.email = freshUser.email;

            if (process.env.NODE_ENV === "development") {
              console.log("[auth] JWT callback – refreshed from DB:", {
                id: token.id,
                profileImageUrl: token.profileImageUrl,
              });
            }
          }
        }
      } catch (err) {
        // Log in dev mode but never throw – falling back to existing token data.
        if (process.env.NODE_ENV === "development") {
          console.warn("JWT callback refresh failed:", err);
        }
      }

      return token;
    },
    
    // Session callback to pass data to client
    async session({ session, token }) {
      if (process.env.NODE_ENV === "development") {
        console.log("[auth] Session callback – incoming token:", {
          id: token.id,
          profileImageUrl: token.profileImageUrl,
        });
      }
      if (token) {
        session.user.id = token.id as string;
        session.user.profileImageUrl = token.profileImageUrl as
          | { thumbnail?: string; medium?: string; large?: string }
          | string
          | null;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.email = token.email as string;
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("[auth] Session callback – outgoing session.user:", {
          id: session.user.id,
          profileImageUrl: session.user.profileImageUrl,
        });
      }
      return session;
    },
    
    // Redirect callback for custom redirect logic
    async redirect({ url, baseUrl }) {
      // Prevent redirect loops back to any auth route
      if (url.startsWith("/auth")) {
        return `${baseUrl}/dashboard`;
      }

      // Same-origin absolute URL – leave untouched
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Relative URL – prefix with baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Default fallback
      return baseUrl;
    },
  },
  
  // Debug mode (enable for development)
  debug: process.env.NODE_ENV === "development",
};
