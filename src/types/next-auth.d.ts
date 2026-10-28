/**
 * NextAuth Type Extensions for CareLinkAI
 * 
 * This file extends the default NextAuth types to include our custom properties
 * like role, firstName, lastName, etc. This ensures proper TypeScript support
 * throughout the application when using NextAuth's session or user objects.
 */

import { UserRole, UserStatus } from "@prisma/client";
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      /** User's unique identifier */
      id: string;
      /** User's role (ADMIN, OPERATOR, CAREGIVER, FAMILY, etc.) */
      role: UserRole;
      /** User's account status */
      status: UserStatus;
      /** User's first name */
      firstName: string;
      /** User's last name */
      lastName: string;
      /** User's email address */
      email: string;
      /**
       * User profile image.
       *  - If string → legacy single URL (e.g. `/uploads/profiles/abc.jpeg`)
       *  - If object → responsive set `{ thumbnail, medium, large }`
       *  - If null  → no image set
       */
      profileImageUrl:
        | {
            thumbnail?: string;
            medium?: string;
            large?: string;
          }
        | string
        | null;
    } & DefaultSession["user"];
  }

  /**
   * Extend the built-in user types
   */
  interface User extends DefaultUser {
    /** User's unique identifier */
    id: string;
    /** User's role (ADMIN, OPERATOR, CAREGIVER, FAMILY, etc.) */
    role: UserRole;
    /** User's account status */
    status: UserStatus;
    /** User's first name */
    firstName: string;
    /** User's last name */
    lastName: string;
    /** User's email address */
    email: string;
    /** User profile image (see Session extension for typing) */
    profileImageUrl:
      | {
          thumbnail?: string;
          medium?: string;
          large?: string;
        }
      | string
      | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the built-in JWT types
   */
  interface JWT {
    /** User's unique identifier */
    id: string;
    /** User's role (ADMIN, OPERATOR, CAREGIVER, FAMILY, etc.) */
    role: UserRole;
    /** User's account status */
    status: UserStatus;
    /** User's first name */
    firstName: string;
    /** User's last name */
    lastName: string;
    /** User's email address */
    email: string;
    /** User profile image (see Session extension for typing) */
    profileImageUrl:
      | {
          thumbnail?: string;
          medium?: string;
          large?: string;
        }
      | string
      | null;
  }
}
