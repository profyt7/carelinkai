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

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole, UserStatus, AuditAction } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import * as nodemailer from "nodemailer";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:5002';

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
 * Send a verification email using nodemailer
 * In development, uses Ethereal for testing (logs preview URL)
 */
async function sendVerificationEmail(userId: string): Promise<boolean> {
  try {
    console.log(`[sendVerificationEmail] Attempting to send email for userId=${userId}`);

    /* Use a dedicated Prisma client for the same reason as above */
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
    
    if (!user || !user.verificationToken) {
      console.error('Cannot send verification email: User not found or missing verification token');
      return false;
    }
    
    console.log(
      `[sendVerificationEmail] user.email=${user.email} ` +
      `token=${user.verificationToken}`
    );

    // Generate verification link with token
    const verificationLink = `${APP_URL}/auth/verify?token=${user.verificationToken}`;
    console.log(`[sendVerificationEmail] verificationLink=${verificationLink}`);
    
    // Create test account for development
    const testAccount = await nodemailer.createTestAccount();
    console.log('[sendVerificationEmail] Created Ethereal test account');
    
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: '"CareLinkAI" <noreply@carelinkai.com>',
      to: user.email,
      subject: "Verify Your CareLinkAI Account",
      text: `
Hello ${user.firstName},

Thank you for registering with CareLinkAI. To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.

If you did not create an account with CareLinkAI, please ignore this email.

Best regards,
The CareLinkAI Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; 
              border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="color: white; margin: 0;">CareLinkAI</h2>
  </div>
  <div class="content">
    <h2>Verify Your Email Address</h2>
    <p>Hello ${user.firstName},</p>
    <p>Thank you for registering with CareLinkAI. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
    
    <a href="${verificationLink}" class="button">Verify Email Address</a>
    
    <p>This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.</p>
    <p>If you did not create an account with CareLinkAI, please ignore this email.</p>
    <p>Best regards,<br>The CareLinkAI Team</p>
    
    <div class="footer">
      <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
    </div>
  </div>
</body>
</html>
      `,
    });
    
    // Log email details in development
    console.log('📧 Verification email sent:');
    console.log('- To:', user.email);
    console.log('- Preview URL:', nodemailer.getTestMessageUrl(info));
    
    await localPrisma.$disconnect();
    return true;
  } catch (error) {
    console.error('[sendVerificationEmail] Failed:', error);
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
              // Optional fields can be added later by the user
              emergencyContact: null,
              emergencyPhone: null
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
        `[registration] ✓ Token generated, calling sendVerificationEmail(${result.id})`
      );

      await sendVerificationEmail(result.id);

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
