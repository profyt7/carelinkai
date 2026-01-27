import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (!user) {
      console.log(`[FORGOT PASSWORD] No user found for email: ${normalizedEmail}`);
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token expiry to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiry: resetTokenExpiry,
      },
    });

    // Create reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://getcarelinkai.com";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset Your CareLinkAI Password",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #3978FC 0%, #7253B7 100%); padding: 30px 40px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">CareLinkAI</h1>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                          Hi ${user.firstName || "there"},
                        </p>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                          We received a request to reset your password for your CareLinkAI account. Click the button below to create a new password:
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3978FC 0%, #7253B7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Reset Password</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          This link will expire in <strong>1 hour</strong> for security purposes.
                        </p>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                        </p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
                          <p style="margin: 0; color: #999999; font-size: 12px;">
                            If the button doesn't work, copy and paste this link into your browser:
                          </p>
                          <p style="margin: 10px 0 0 0; color: #3978FC; font-size: 12px; word-break: break-all;">
                            ${resetUrl}
                          </p>
                        </div>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 20px 40px; text-align: center;">
                        <p style="margin: 0; color: #999999; font-size: 12px;">
                          &copy; ${new Date().getFullYear()} CareLinkAI. All rights reserved.
                        </p>
                        <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                          San Francisco, CA
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
      console.log(`[FORGOT PASSWORD] Reset email sent to: ${normalizedEmail}`);
    } catch (emailError) {
      console.error("[FORGOT PASSWORD] Failed to send reset email:", emailError);
      // Don't expose email sending failure to user
    }

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("[FORGOT PASSWORD] Error:", error);
    return NextResponse.json(
      { message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
