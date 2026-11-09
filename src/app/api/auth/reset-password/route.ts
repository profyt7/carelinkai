import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { captureError } from '@/lib/sentry';
import { errorSummary } from '@/lib/log-safe';
import { passwordProblems } from '@/lib/password-policy';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength — same rule as every other password form (src/lib/password-policy.ts).
    if (typeof password !== "string") {
      return NextResponse.json({ message: "Token and password are required" }, { status: 400 });
    }
    const problems = passwordProblems(password);
    if (problems.length) {
      return NextResponse.json({ message: problems[0], errors: problems }, { status: 400 });
    }

    // Hash the provided token to match stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      },
    });

    console.log('[RESET PASSWORD] Password reset successful');

    return NextResponse.json({
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'auth:reset-password' },
    });
    console.error("[RESET PASSWORD] Error:", errorSummary(error));
    return NextResponse.json(
      { message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
