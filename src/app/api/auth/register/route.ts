/**
 * User Registration API Endpoint for CareLinkAI
 * 
 * This API handles secure user registration with:
 * - Input validation
 * - Duplicate email checking
 * - Password hashing
 * - User record creation
 * - Role-specific profile creation (Family, Operator, Caregiver, Affiliate)
 * - Initial status management
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole, UserStatus, AuditAction } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;

// Input validation schema
const registrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(["FAMILY", "OPERATOR", "CAREGIVER", "AFFILIATE", "PROVIDER"]),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  })
});

/**
 * Create a verification token and store it in the database
 */
async function createVerificationToken(userId: string): Promise<string> {
  console.log(`[createVerificationToken] Generating token for userId=${userId}`);
  const token = randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  /* ------------------------------------------------------------------
   * Use a short-lived Prisma instance so this logic is independent from
   * the request-scope `prisma` that is disconnected in the handler’s
   * finally-block. This prevents “PrismaClient is already disconnected”
   * errors and ensures the token is actually written.
   * ---------------------------------------------------------------- */
  const localPrisma = new PrismaClient();
  try {
    await localPrisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationTokenExpiry: expires,
      },
    });
  } finally {
    await localPrisma.$disconnect();
  }

  console.log(
    `[createVerificationToken] Token persisted for userId=${userId} ` +
    `token=${token} expires=${expires.toISOString()}`
  );
  return token;
}

/**
 * Send verification email using Resend API
 * Wrapper function that fetches user data and calls the Resend email utility
 */
async function sendVerificationEmailToUser(userId: string): Promise<boolean> {
  try {
    console.log(`[sendVerificationEmail] Attempting to send email for userId=${userId}`);

    /* Use a dedicated Prisma client to avoid disconnection issues */
    const localPrisma = new PrismaClient();

    // Get user information
    const user = await localPrisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        verificationToken: true,
      },
    });
    
    await localPrisma.$disconnect();
    
    if (!user || !user.verificationToken) {
      console.error('[sendVerificationEmail] User not found or missing verification token');
      return false;
    }
    
    console.log(
      `[sendVerificationEmail] Sending to user.email=${user.email} with token`
    );

    // Call Resend email utility
    const emailSent = await sendVerificationEmail(
      user.email,
      user.firstName,
      user.verificationToken
    );
    
    if (emailSent) {
      console.log('[sendVerificationEmail] ✅ Email sent successfully via Resend');
    } else {
      console.error('[sendVerificationEmail] ❌ Failed to send email via Resend');
    }
    
    return emailSent;
  } catch (error) {
    console.error('[sendVerificationEmail] Exception:', error);
    return false;
  }
}

/**
 * POST handler for user registration
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = registrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid input data", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    // Extract validated data
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role, 
      agreeToTerms 
    } = validationResult.data;
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already in use" }, 
        { status: 409 }
      );
    }
    
    // Hash password
    const passwordHash = await hash(password, SALT_ROUNDS);
    
    // Create user record with transaction to ensure all related records are created
    const result = await prisma.$transaction(async (tx) => {
      // Create base user record
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: role as UserRole,
          status: UserStatus.PENDING,  // Users start as PENDING until email verification
        }
      });
      
      // Create role-specific profile based on selected role
      switch (role) {
        case "FAMILY":
          await tx.family.create({
            data: {
              userId: user.id,
              // Emergency contact fields (legacy)
              emergencyContact: null,
              emergencyPhone: null,
              // Primary contact info (new care context fields)
              primaryContactName: null,
              phone: phone || null, // Use registration phone if provided
              relationshipToRecipient: null,
              // Care recipient details
              recipientAge: null,
              primaryDiagnosis: null,
              mobilityLevel: null,
              careNotes: null
            }
          });
          break;
          
        case "OPERATOR":
          await tx.operator.create({
            data: {
              userId: user.id,
              companyName: `${firstName}'s Care Home`, // Default company name
              taxId: null,
              businessLicense: null
            }
          });
          break;
          
        case "CAREGIVER":
          await tx.caregiver.create({
            data: {
              userId: user.id,
              bio: null,
              yearsExperience: null,
              hourlyRate: null,
              availability: {} // Empty JSON object for availability
            }
          });
          break;
          
        case "AFFILIATE":
          await tx.affiliate.create({
            data: {
              userId: user.id,
              affiliateCode: uuidv4().substring(0, 8).toUpperCase(), // Generate unique affiliate code
              organization: null,
              commissionRate: null,
              paymentDetails: {} // Empty JSON object for payment details
            }
          });
          break;
          
        case "PROVIDER":
          await tx.provider.create({
            data: {
              userId: user.id,
              businessName: `${firstName} ${lastName}`, // Default business name from user's name
              contactName: `${firstName} ${lastName}`,
              contactEmail: normalizedEmail,
              contactPhone: phone || null,
              bio: null,
              website: null,
              insuranceInfo: null,
              licenseNumber: null,
              yearsInBusiness: null,
              isVerified: false,
              isActive: true,
              serviceTypes: [], // Empty array, provider can add services later
              coverageArea: {} // Empty JSON object for coverage area
            }
          });
          break;
          
        default:
          throw new Error("Invalid role selected");
      }
      
      // Create audit log entry for registration
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          resourceType: "USER",
          resourceId: user.id,
          description: "User registration via API",
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            // @ts-ignore - `ip` exists only in Node runtime requests
            (request as any).ip ||
            "unknown",
          metadata: {
            method: "API",
            role
          },
          userId: user.id,
          actionedBy: user.id
        }
      });
      
      return user;
    });
    
    /* ------------------------------------------------------------------
     * EMAIL VERIFICATION
     * 1. Generate & persist a verification token
     * 2. Send the verification email
     * ---------------------------------------------------------------- */
    // Keep DB connection open for email verification; do not fail registration
    try {
      console.log(
        `[registration] Starting e-mail verification workflow for userId=${result.id}`
      );

      console.log(
        `[registration] → Calling createVerificationToken(${result.id})`
      );
      await createVerificationToken(result.id);
      console.log(
        `[registration] ✓ Token generated, calling sendVerificationEmailToUser(${result.id})`
      );

      await sendVerificationEmailToUser(result.id);

      console.log(
        `[registration] ✓ Verification e-mail queued successfully for userId=${result.id}`
      );
    } catch (emailErr) {
      // Log but do not abort user creation
      console.error("[registration] Email verification step failed:", emailErr);
    }
    
    // Return success response (excluding sensitive data)
    await prisma.$disconnect(); // disconnect after all async work is done
    return NextResponse.json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        status: result.status,
        createdAt: result.createdAt
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle specific errors
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { success: false, message: "Email already in use" }, 
        { status: 409 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Registration failed", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  }
}
