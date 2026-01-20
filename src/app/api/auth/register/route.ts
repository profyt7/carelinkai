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
  phone: z.string().optional().refine(
    (val) => !val || /^(\+1\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(val),
    { message: "Please enter a valid US phone number" }
  ),
  role: z.enum(["FAMILY", "OPERATOR", "CAREGIVER", "AFFILIATE", "PROVIDER"]),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
  // New optional fields
  relationshipToRecipient: z.enum(["SELF", "PARENT", "SPOUSE", "SIBLING", "OTHER"]).optional(),
  carePreferences: z.string().max(1000, "Care preferences must be under 1000 characters").optional(),
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "BOTH"]).optional()
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
  console.log("=".repeat(60));
  console.log("[REGISTER API] Request received at:", new Date().toISOString());
  console.log("[REGISTER API] Request method:", request.method);
  console.log("[REGISTER API] Request URL:", request.url);
  
  let rawBody: any;
  try {
    // Parse and validate request body
    rawBody = await request.json();
    console.log("[REGISTER API] Raw request body keys:", Object.keys(rawBody));
    console.log("[REGISTER API] Raw body (sanitized):", JSON.stringify({
      ...rawBody,
      password: rawBody.password ? "[REDACTED]" : undefined
    }, null, 2));
    
    // Validate input against schema
    console.log("[REGISTER API] Starting validation...");
    const validationResult = registrationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.log("[REGISTER API] Validation FAILED:", JSON.stringify(validationResult.error.flatten().fieldErrors));
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid input data", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    console.log("[REGISTER API] Validation PASSED");
    
    // Extract validated data
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role, 
      agreeToTerms,
      relationshipToRecipient,
      carePreferences,
      preferredContactMethod
    } = validationResult.data;
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    console.log("[REGISTER API] Normalized email:", normalizedEmail);
    console.log("[REGISTER API] Role:", role);
    
    // Check if user already exists
    console.log("[REGISTER API] Checking for existing user...");
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    console.log("[REGISTER API] Existing user check complete:", existingUser ? "USER EXISTS" : "NO EXISTING USER");
    
    if (existingUser) {
      console.log("[REGISTER API] REJECTING: Email already in use");
      return NextResponse.json(
        { success: false, message: "Email already in use" }, 
        { status: 409 }
      );
    }
    
    // Hash password
    console.log("[REGISTER API] Hashing password...");
    const passwordHash = await hash(password, SALT_ROUNDS);
    console.log("[REGISTER API] Password hashed successfully");
    
    // Create user record with transaction to ensure all related records are created
    console.log("[REGISTER API] Starting database transaction...");
    const result = await prisma.$transaction(async (tx) => {
      console.log("[REGISTER API] Inside transaction");
      
      // BUG-003 FIX: Build user data object dynamically to avoid potential field issues
      const userData: any = {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: role as UserRole,
        status: UserStatus.PENDING,  // Users start as PENDING until email verification
      };
      
      // Only add preferredContactMethod if provided (handles case where field might not exist in DB)
      if (preferredContactMethod) {
        console.log("[REGISTER API] Adding preferredContactMethod:", preferredContactMethod);
        userData.preferredContactMethod = preferredContactMethod;
      }
      
      console.log("[REGISTER API] Creating user with data:", JSON.stringify({ 
        ...userData, 
        passwordHash: '[REDACTED]' 
      }));
      
      // Create base user record
      console.log("[REGISTER API] Calling tx.user.create...");
      const user = await tx.user.create({
        data: userData
      });
      console.log("[REGISTER API] User created successfully, id:", user.id);
      
      // Create role-specific profile based on selected role
      console.log("[REGISTER API] Creating role-specific profile for role:", role);
      switch (role) {
        case "FAMILY":
          console.log("[REGISTER API] Creating FAMILY profile...");
          // BUG-003 FIX: Build family data dynamically with better null handling
          const familyData: any = {
            userId: user.id,
            // Emergency contact fields (legacy)
            emergencyContact: null,
            emergencyPhone: null,
            // Primary contact info
            primaryContactName: null,
            phone: phone || null,
            // Care recipient details
            recipientAge: null,
            primaryDiagnosis: null,
            mobilityLevel: null,
          };
          
          // Only add optional fields if they have values
          if (relationshipToRecipient) {
            console.log("[REGISTER API] Adding relationshipToRecipient:", relationshipToRecipient);
            familyData.relationshipToRecipient = relationshipToRecipient;
          }
          if (carePreferences) {
            console.log("[REGISTER API] Adding careNotes from carePreferences");
            familyData.careNotes = carePreferences;
          }
          
          console.log("[REGISTER API] Family data:", JSON.stringify(familyData));
          console.log("[REGISTER API] Calling tx.family.create...");
          await tx.family.create({ data: familyData });
          console.log("[REGISTER API] Family profile created successfully");
          break;
          
        case "OPERATOR":
          console.log("[REGISTER API] Creating OPERATOR profile...");
          await tx.operator.create({
            data: {
              userId: user.id,
              companyName: `${firstName}'s Care Home`, // Default company name
              taxId: null,
              businessLicense: null
            }
          });
          console.log("[REGISTER API] Operator profile created successfully");
          break;
          
        case "CAREGIVER":
          console.log("[REGISTER API] Creating CAREGIVER profile...");
          await tx.caregiver.create({
            data: {
              userId: user.id,
              bio: null,
              yearsExperience: null,
              hourlyRate: null,
              availability: {} // Empty JSON object for availability
            }
          });
          console.log("[REGISTER API] Caregiver profile created successfully");
          break;
          
        case "AFFILIATE":
          console.log("[REGISTER API] Creating AFFILIATE profile...");
          await tx.affiliate.create({
            data: {
              userId: user.id,
              affiliateCode: uuidv4().substring(0, 8).toUpperCase(), // Generate unique affiliate code
              organization: null,
              commissionRate: null,
              paymentDetails: {} // Empty JSON object for payment details
            }
          });
          console.log("[REGISTER API] Affiliate profile created successfully");
          break;
          
        case "PROVIDER":
          console.log("[REGISTER API] Creating PROVIDER profile...");
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
          console.log("[REGISTER API] Provider profile created successfully");
          break;
          
        default:
          console.log("[REGISTER API] ERROR: Invalid role:", role);
          throw new Error("Invalid role selected");
      }
      
      // Create audit log entry for registration
      console.log("[REGISTER API] Creating audit log...");
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
      console.log("[REGISTER API] Audit log created successfully");
      
      console.log("[REGISTER API] Transaction completed successfully, returning user");
      return user;
    });
    console.log("[REGISTER API] Transaction committed, user id:", result.id);
    
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
    console.error("=".repeat(60));
    console.error("[REGISTER API] ❌ REGISTRATION ERROR CAUGHT");
    console.error("[REGISTER API] Error type:", typeof error);
    console.error("[REGISTER API] Error name:", error?.name);
    console.error("[REGISTER API] Error code:", error?.code);
    console.error("[REGISTER API] Error message:", error?.message);
    console.error("[REGISTER API] Error meta:", JSON.stringify(error?.meta));
    console.error("[REGISTER API] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    if (error?.stack) {
      console.error("[REGISTER API] Stack trace:");
      console.error(error.stack);
    }
    console.error("=".repeat(60));
    
    // Handle specific Prisma errors
    if (error.code === "P2002") {
      console.log("[REGISTER API] Handling P2002 (unique constraint violation)");
      if (error.meta?.target?.includes("email")) {
        return NextResponse.json(
          { success: false, message: "Email already in use" }, 
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: "A record with this data already exists" }, 
        { status: 409 }
      );
    }
    
    // Handle Prisma validation errors (unknown field)
    if (error.code === "P2025" || error.message?.includes("Unknown argument") || error.message?.includes("Unknown field")) {
      console.error("[REGISTER API] Prisma schema mismatch - possible missing migration");
      console.error("[REGISTER API] This usually means a field in the code doesn't exist in the database schema");
      return NextResponse.json(
        { 
          success: false, 
          message: "Registration service temporarily unavailable. Please try again later.",
          error: process.env.NODE_ENV === "development" ? error.message : undefined 
        }, 
        { status: 500 }
      );
    }
    
    // Generic error response
    console.log("[REGISTER API] Returning generic 500 error response");
    return NextResponse.json(
      { 
        success: false, 
        message: "Registration failed. Please try again.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  }
}
