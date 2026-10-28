import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { captureError } from '@/lib/sentry';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false });
    }

    // Hash the provided token to match stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Check if token exists and is not expired
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiry: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ valid: !!user });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'auth:verify-reset-token' },
    });
    console.error("[VERIFY RESET TOKEN] Error:", error);
    return NextResponse.json({ valid: false });
  }
}
