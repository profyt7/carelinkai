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
import { PrismaClient, AuditAction } from "@prisma/client";
import type { UserStatus } from "@prisma/client";
import { compare } from "bcryptjs";
import { authenticator } from "otplib";

// Initialize Prisma client
const prisma = new PrismaClient();

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
  
  // Configure JWT
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
          // Log failed login attempt for non-existent user
          await prisma.auditLog.create({
            data: {
              action: AuditAction.SECURITY,
              resourceType: "AUTH",
              resourceId: "unknown",
              description: "Failed login attempt for non-existent user",
              ipAddress: req.headers?.["x-forwarded-for"] || "unknown",
              metadata: {
                email,
                reason: "USER_NOT_FOUND"
              }
            }
          });
          
          throw new Error("Invalid email or password");
        }
        
        // Check if account is active
        if (user.status !== "ACTIVE") {
          // Log failed login attempt for inactive account
          await prisma.auditLog.create({
            data: {
              action: AuditAction.SECURITY,
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
          throw new Error("Invalid email or password");
        }
        const passwordValid = await compare(credentials.password, user.passwordHash);
        
        if (!passwordValid) {
          // Log failed login attempt due to invalid password
          await prisma.auditLog.create({
            data: {
              action: AuditAction.SECURITY,
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
                action: AuditAction.SECURITY,
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
                action: AuditAction.SECURITY,
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
            action: AuditAction.SECURITY,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
        token.twoFactorEnabled = user.twoFactorEnabled;
      }
      return token;
    },
    
    // Add custom session data
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as Date;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
      }
      return session;
    }
  },
  
  // Enable debug in development
  debug: process.env["NODE_ENV"] === "development",
};

export default authOptions;
