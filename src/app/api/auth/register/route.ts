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

import { founderUpdateFromClaim } from '@/lib/claim-founder';
import { NextRequest, NextResponse } from "next/server";
import { UserRole, UserStatus, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { captureError } from '@/lib/sentry';
import { recordSmsConsent } from '@/lib/consent/sms-consent-server';
import { SMS_CONSENT_FORMS } from '@/lib/consent/sms-consent';
import { verifyClaimToken } from '@/lib/claim-token';
import { errorSummary } from '@/lib/log-safe';
import { PROVIDER_CATEGORY_VALUES } from '@/lib/providers/categories';


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
  role: z.enum(["FAMILY", "OPERATOR", "CAREGIVER", "AFFILIATE", "PROVIDER", "DISCHARGE_PLANNER"]),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
  // New optional fields
  relationshipToRecipient: z.enum(["SELF", "PARENT", "SPOUSE", "SIBLING", "OTHER"]).optional(),
  carePreferences: z.string().max(1000, "Care preferences must be under 1000 characters").optional(),
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "BOTH"]).optional(),
  referredByCode: z.string().max(20).optional(), // affiliate ?ref= code captured from URL
  claimToken: z.string().optional(), // Cleveland founder claim token
  // PROVIDER only: launch categories picked at signup (optional; more can be added on the profile)
  serviceTypes: z.array(z.string()).max(6).optional()
    .refine((v) => !v || v.every((s) => PROVIDER_CATEGORY_VALUES.includes(s)), { message: "Unknown service category" }),
});

/**
 * Create a verification token and store it in the database
 */
async function createVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  // Shared singleton (src/lib/prisma.ts) — nothing disconnects it per request
  // any more, so the old "short-lived local client" workaround is gone.
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationTokenExpiry: expires,
    },
  });

  return token;
}

/**
 * Send verification email using Resend API
 * Wrapper function that fetches user data and calls the Resend email utility
 */
async function sendVerificationEmailToUser(userId: string): Promise<boolean> {
  try {

    // Get user information (shared singleton — see src/lib/prisma.ts)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        verificationToken: true,
      },
    });

    if (!user || !user.verificationToken) {
      console.error('[sendVerificationEmail] User not found or missing verification token');
      return false;
    }
    

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
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'auth:register' },
    });
    console.error('[sendVerificationEmail] Exception:', errorSummary(error));
    return false;
  }
}

/**
 * POST handler for user registration
 */
export async function POST(request: NextRequest) {
  
  let rawBody: any;
  try {
    // Parse and validate request body
    rawBody = await request.json();

    // Validate input against schema
    console.log("[REGISTER API] Starting validation...");
    const validationResult = registrationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.log('[REGISTER API] Validation FAILED');
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
      preferredContactMethod,
      referredByCode,
      claimToken,
      serviceTypes,
    } = validationResult.data;
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Check if user already exists
    console.log("[REGISTER API] Checking for existing user...");
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    console.log('[REGISTER API] Existing user check complete');
    
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
        userData.preferredContactMethod = preferredContactMethod;
      }
      
      
      // Create base user record
      console.log("[REGISTER API] Calling tx.user.create...");
      const user = await tx.user.create({
        data: userData
      });
      console.log('[REGISTER API] User created');
      
      // Create role-specific profile based on selected role
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
            familyData.relationshipToRecipient = relationshipToRecipient;
          }
          if (carePreferences) {
            console.log("[REGISTER API] Adding careNotes from carePreferences");
            familyData.careNotes = carePreferences;
          }
          if (referredByCode) {
            familyData.referredByCode = referredByCode.toUpperCase();
          }

          console.log("[REGISTER API] Calling tx.family.create...");
          await tx.family.create({ data: familyData });
          console.log("[REGISTER API] Family profile created successfully");
          break;
          
        case "OPERATOR": {
          console.log("[REGISTER API] Creating OPERATOR profile...");
          const newOperator = await tx.operator.create({
            data: {
              userId: user.id,
              companyName: `${firstName}'s Care Home`,
              taxId: null,
              businessLicense: null,
            },
          });

          // Apply Cleveland founder claim token at signup time so it survives
          // the email-verification redirect (token is no longer needed in the URL)
          if (claimToken) {
            const payload = verifyClaimToken(
              claimToken,
              process.env['NEXTAUTH_SECRET'] ?? ''
            );
            if (payload && payload.operatorEmail.toLowerCase() === normalizedEmail) {
              console.log("[REGISTER API] Applying claim token");
              // OL-248: founder status only from what the link says (a cohort link minted false stays false).
              await tx.operator.update({
                where: { id: newOperator.id },
                data: founderUpdateFromClaim({ clevelandFounder: false, freeAccessUntil: null }, payload),
              });
            } else {
              console.log("[REGISTER API] Claim token invalid or email mismatch — skipping");
            }
          }

          console.log("[REGISTER API] Operator profile created successfully");
          break;
        }
          
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
              serviceTypes: Array.from(new Set(serviceTypes ?? [])), // launch categories picked at signup; more on the profile
              coverageArea: {} // Empty JSON object for coverage area
            }
          });
          console.log("[REGISTER API] Provider profile created successfully");
          break;

        case "DISCHARGE_PLANNER":
          console.log("[REGISTER API] Creating DISCHARGE_PLANNER profile...");
          await tx.dischargePlannerProfile.create({
            data: {
              userId: user.id,
              organization: null,
              title: null,
            }
          });
          console.log("[REGISTER API] DischargePlannerProfile created successfully");
          break;

        default:
          console.log('[REGISTER API] ERROR: Invalid role');
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
    console.log('[REGISTER API] Transaction committed');

    // OL-184: SMS opt-in from the registration checkbox (raw body — the zod
    // schema strips unknown keys). A row only when checked and a phone given.
    await recordSmsConsent({
      consent: (rawBody as Record<string, unknown> | null)?.smsConsent,
      sourceForm: SMS_CONSENT_FORMS.REGISTER,
      phone: phone || null,
      req: request,
      userId: result.id,
      contactName: `${firstName} ${lastName}`.trim(),
      contactEmail: normalizedEmail,
    });
    
    /* ------------------------------------------------------------------
     * EMAIL VERIFICATION
     * 1. Generate & persist a verification token
     * 2. Send the verification email
     * ---------------------------------------------------------------- */
    // Keep DB connection open for email verification; do not fail registration
    try {
      console.log('[registration] Starting e-mail verification workflow');

      await createVerificationToken(result.id);

      await sendVerificationEmailToUser(result.id);

      console.log('[registration] ✓ Verification e-mail queued successfully');
    } catch (emailErr) {
      captureError(emailErr instanceof Error ? emailErr : new Error(String(emailErr)), {
        tags: { route: 'auth:register' },
      });
      // Log but do not abort user creation
      console.error("[registration] Email verification step failed:", errorSummary(emailErr));
    }

    // Provider onboarding welcome email (fire-and-forget)
    if (role === "PROVIDER" && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";
      resend.emails.send({
        from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
        to: [normalizedEmail],
        subject: "Welcome to CareLinkAI — let's get you listed",
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
          <h2 style="color:#0066cc">Welcome, ${firstName}!</h2>
          <p>You're now registered as a provider on <strong>CareLinkAI</strong> — Cleveland's platform for senior care and NEMT transport. Here's how to get visible to families and facilities:</p>
          <ol style="padding-left:20px;line-height:2">
            <li><strong>Complete your profile</strong> — add your bio, service types, hourly rate, and coverage area.<br>
              <a href="${appUrl}/settings/provider" style="color:#0066cc">Go to Profile Settings →</a></li>
            <li><strong>Add your credentials</strong> — background check, insurance, CPR cert, and more. 3 verified credentials earns you the <em>CareLinkAI Certified</em> badge.<br>
              <a href="${appUrl}/settings/provider/credentials" style="color:#0066cc">Upload Credentials →</a></li>
            <li><strong>Activate your listing</strong> — once your profile is complete, turn on your listing to appear in marketplace search.<br>
              <a href="${appUrl}/settings/provider/billing" style="color:#0066cc">Activate Listing →</a></li>
          </ol>
          <p style="margin-top:24px">Questions? Reply to this email — we're a small team and we read everything.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">CareLinkAI · Cleveland, OH</p>
        </div>`,
      }).catch((err: unknown) => {
        console.error("[registration] Provider welcome email failed:", errorSummary(err));
      });
    }
    
    // Return success response (excluding sensitive data)
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
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'auth:register' },
    });
    // OL-231: class/code only — Prisma errors can echo the submitted email.
    console.error("[REGISTER API] ❌ REGISTRATION ERROR:", errorSummary(error));
    
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
