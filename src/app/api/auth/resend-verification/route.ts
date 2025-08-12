/**
 * Resend Verification Email API Endpoint for CareLinkAI
 * 
 * This API handles resending verification emails by:
 * - Validating that the email exists
 * - Checking if the user is still pending verification
 * - Generating a new verification token
 * - Sending a new verification email
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserStatus } from "@prisma/client";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as nodemailer from "nodemailer";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const TOKEN_EXPIRY_HOURS = 24;
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:5002';

// Input validation schema
const resendSchema = z.object({
  email: z.string().email("Invalid email address")
});

/**
 * Generate a verification token and store it in the database
 */
async function createVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);
  
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
 * Send a verification email using nodemailer
 */
async function sendVerificationEmail(userId: string): Promise<boolean> {
  try {
    // Get user information
    const user = await prisma.user.findUnique({
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
    
    // Generate verification link with token
    const verificationLink = `${APP_URL}/auth/verify?token=${user.verificationToken}`;
    
    // Create test account for development
    const testAccount = await nodemailer.createTestAccount();
    
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
    
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Resend verification email to a user
 */
async function resendVerificationEmail(email: string): Promise<boolean> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, status: true },
    });
    
    if (!user) {
      console.error('Cannot resend verification email: User not found');
      return false;
    }
    
    if (user.status !== UserStatus.PENDING) {
      console.error('Cannot resend verification email: User already verified or not in PENDING status');
      return false;
    }
    
    // Create new verification token
    await createVerificationToken(user.id);
    
    // Send verification email
    return await sendVerificationEmail(user.id);
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    return false;
  }
}

/**
 * POST handler for resending verification emails
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate input against schema
    const validationResult = resendSchema.safeParse(body);
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
    
    const { email } = validationResult.data;
    
    // Check if user exists and needs verification
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, status: true, emailVerified: true }
    });
    
    // User not found
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found with this email address" },
        { status: 404 }
      );
    }
    
    // User already verified
    if (user.status !== UserStatus.PENDING || user.emailVerified) {
      return NextResponse.json(
        { success: false, message: "This account is already verified" },
        { status: 400 }
      );
    }
    
    // Resend verification email
    const emailSent = await resendVerificationEmail(email.toLowerCase());
    
    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Verification email has been sent. Please check your inbox and spam folder."
    });
    
  } catch (error: any) {
    console.error("Resend verification error:", error);
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to resend verification email", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
