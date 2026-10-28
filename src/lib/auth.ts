/**
 * NextAuth Configuration for CareLinkAI
 * 
 * This file configures authentication for the CareLinkAI platform with:
 * - Credentials provider for email/password authentication
 * - Two-factor authentication support
 * - JWT handling and session management
 * - Role-based access control
 * - Audit logging for authentication events
 * - Integration with Prisma for database access
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UserStatus, UserRole } from "@prisma/client";
import { compare } from "bcryptjs";
import { authenticator } from "otplib";

// Assumption: Use shared Prisma client singleton to avoid connection bloat

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  // Configure JWT session
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
    // Harden cookies (secure in production, httpOnly, SameSite=lax)
  cookies: {
    sessionToken: {
      // Align cookie name with security: when insecure cookies are allowed, use non-__Secure name
      name: (process.env.NODE_ENV === 'production' && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1')
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // In local e2e/prod-server scenarios (http://localhost), allow opting out of Secure cookies
        // to enable NextAuth sessions over HTTP. Never use this in real production.
        secure: process.env.NODE_ENV === 'production' && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1',
      },
    },
  },// Configure JWT
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Configure pages
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  
  // Configure providers
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "Two-Factor Code", type: "text" },
      },
      
      async authorize(credentials, req) {
        try { console.log('[auth] authorize called for', credentials?.email); } catch {}
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }
        
        // Normalize email to lowercase
        const email = credentials.email.toLowerCase();
        
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            emailVerified: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            backupCodes: true,
            lastLoginAt: true,
          }
        });
        
        // User not found
        if (!user) {
          try { console.warn('[auth] user not found for', email); } catch {}
          console.warn("[auth] Failed login attempt for non-existent user", { 
            email, 
            ip: req.headers?.["x-forwarded-for"] || "unknown" 
          });
          
          throw new Error("Invalid email or password");
        }
        
        // Check if account is active
        if (user.status !== "ACTIVE") {
          // Log failed login attempt for inactive account
          await prisma.auditLog.create({
            data: {
              action: AuditAction.ACCESS_DENIED,
              resourceType: "AUTH",
              resourceId: user.id,
              description: "Login attempt on inactive account",
              ipAddress: req.headers?.["x-forwarded-for"] || "unknown",
              userId: user.id,
              metadata: {
                email,
                status: user.status,
                reason: "ACCOUNT_INACTIVE"
              }
            }
          });
          
          if (user.status === "PENDING") {
            throw new Error("Please verify your email before logging in");
          } else {
            throw new Error("Your account is not active");
          }
        }
        
        // Verify password
        if (!user.passwordHash) {
          try { console.warn('[auth] user has no passwordHash', email); } catch {}
          throw new Error("Invalid email or password");
        }
        const passwordValid = await compare(credentials.password, user.passwordHash);
        try { console.log('[auth] passwordValid=', passwordValid, 'for', email); } catch {}
        
        if (!passwordValid) {
          // Log failed login attempt due to invalid password
          await prisma.auditLog.create({
            data: {
              action: AuditAction.ACCESS_DENIED,
              resourceType: "AUTH",
              resourceId: user.id,
              description: "Failed login attempt - invalid password",
              ipAddress: req.headers?.["x-forwarded-for"] || "unknown",
              userId: user.id,
              metadata: {
                email,
                reason: "INVALID_PASSWORD"
              }
            }
          });
          
          throw new Error("Invalid email or password");
        }
        
        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          // If 2FA is enabled but no code provided, return partial user info
          if (!credentials.twoFactorCode) {
            return {
              id: user.id,
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              requiresTwoFactor: true,
              profileImageUrl: null,
              status: user.status,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
            } as any;
          }
          
          // Verify 2FA code
          const isValidToken = user.twoFactorSecret && 
            authenticator.verify({
              token: credentials.twoFactorCode,
              secret: user.twoFactorSecret
            });
          
          // Check backup codes if token is not valid
          const isValidBackupCode = !isValidToken && 
            user.backupCodes && 
            Array.isArray(user.backupCodes) && 
            user.backupCodes.includes(credentials.twoFactorCode);
          
          if (!isValidToken && !isValidBackupCode) {
            // Log failed 2FA attempt
            await prisma.auditLog.create({
              data: {
                action: AuditAction.ACCESS_DENIED,
                resourceType: "AUTH",
                resourceId: user.id,
                description: "Failed 2FA verification",
                ipAddress: req.headers?.["x-forwarded-for"] || "unknown",
                userId: user.id,
                metadata: {
                  email,
                  reason: "INVALID_2FA_CODE"
                }
              }
            });
            
            try { console.warn('[auth] invalid 2fa code for', email); } catch {}
            throw new Error("Invalid two-factor code");
          }
          
          // If backup code was used, remove it
          if (isValidBackupCode && user.backupCodes) {
            const updatedBackupCodes = (user.backupCodes as string[])
              .filter(code => code !== credentials.twoFactorCode);
            
            await prisma.user.update({
              where: { id: user.id },
              data: { backupCodes: updatedBackupCodes }
            });
            
            // Log backup code usage
            await prisma.auditLog.create({
              data: {
                action: AuditAction.OTHER,
                resourceType: "AUTH",
                resourceId: user.id,
                description: "Backup code used for 2FA",
                ipAddress: req.headers?.["x-forwarded-for"] || "unknown",
                userId: user.id,
                metadata: {
                  email,
                  remainingCodes: updatedBackupCodes.length
                }
              }
            });
          }
        }
        
        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });
        
        // Log successful login
        await prisma.auditLog.create({
          data: {
            action: AuditAction.LOGIN,
            resourceType: "AUTH",
            resourceId: user.id,
            description: "Successful login",
            ipAddress: req.headers?.["x-forwarded-for"] || "unknown",
            userId: user.id,
            actionedBy: user.id,
            metadata: {
              email,
              method: "credentials",
              twoFactorUsed: user.twoFactorEnabled
            }
          }
        });
        
        try { console.log('[auth] successful credentials login for', email); } catch {}
        // Return user object (excluding sensitive data)
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          profileImageUrl: null
        } as any;
      }
    })
  ],
  
  // Callbacks to customize session and JWT behavior
  callbacks: {
    // Add custom claims to JWT
    async jwt({ token, user, trigger }) {
      if (user) {
        token["id"] = (user as any).id;
        token["email"] = (user as any).email;
        token["name"] = (user as any).name;
        token["firstName"] = (user as any).firstName;
        token["lastName"] = (user as any).lastName;
        token["role"] = (user as any).role;
        token["emailVerified"] = (user as any).emailVerified as any;
        token["twoFactorEnabled"] = (user as any).twoFactorEnabled;
      }
      
      // On session update or refresh, fetch latest user data including profile image
      if (trigger === "update" || !token["profileImageUrl"]) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token["id"] as string },
            select: { profileImageUrl: true, firstName: true, lastName: true }
          });
          if (dbUser) {
            // Extract the medium or thumbnail URL from the JSON structure
            const imgUrl = dbUser.profileImageUrl;
            if (imgUrl && typeof imgUrl === 'object') {
              const imgData = imgUrl as { medium?: string; thumbnail?: string; original?: string };
              token["profileImageUrl"] = imgData.medium || imgData.thumbnail || imgData.original || null;
            } else if (typeof imgUrl === 'string') {
              token["profileImageUrl"] = imgUrl;
            } else {
              token["profileImageUrl"] = null;
            }
            // Also update name in case it changed
            token["firstName"] = dbUser.firstName;
            token["lastName"] = dbUser.lastName;
            token["name"] = `${dbUser.firstName} ${dbUser.lastName}`;
          }
        } catch (e) {
          // Ignore errors - don't break the session
          console.error('[auth] Error fetching profile image:', e);
        }
      }
      
      return token;
    },
    
    // Add custom session data
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token["id"] as string;
        session.user.email = token["email"] as string;
        session.user.name = token["name"] as string;
        session.user.firstName = token["firstName"] as string;
        session.user.lastName = token["lastName"] as string;
        session.user.role = token["role"] as UserRole;
        // Include profile image URL in session
        (session.user as any).image = token["profileImageUrl"] as string | null;
        (session.user as any).profileImageUrl = token["profileImageUrl"] as string | null;
      }
      return session;
    },
    
    // Role-based redirect after sign-in
    async redirect({ url, baseUrl }) {
      // If the URL is already pointing to a specific path, use it
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If the URL contains the baseUrl, extract the path
      else if (new URL(url).origin === baseUrl) return url;
      
      // Default redirect to baseUrl
      return baseUrl;
    },
    
    // Sign-in callback for role-based routing
    async signIn({ user }) {
      // Allow sign-in for all users
      return true;
    }
  },
  
  // Enable debug in development
  debug: process.env["NODE_ENV"] === "development",
};

export default authOptions;

