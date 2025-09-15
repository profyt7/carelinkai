import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, message: "Only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    
    // Validate email
    if (!body.email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase();
    
    // Initialize Prisma
    const prisma = new PrismaClient();
    
    // Update user status
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
      },
    }).catch(() => null);
    
    // Disconnect Prisma
    await prisma.$disconnect();
    
    // Handle user not found
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Success response
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error activating user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to activate user" },
      { status: 500 }
    );
  }
}
