export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET handler to retrieve a valid family ID for the current user
 * This is primarily for development to avoid foreign key constraint errors
 * when uploading documents
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // First try to find a family associated with the current user
    let family = await prisma.family.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    // If the user has a family, return its ID
    if (family) {
      return NextResponse.json({ familyId: family.id });
    }
    
    // If no family is associated with the user, look for any existing family
    const anyFamily = await prisma.family.findFirst({
      select: { id: true }
    });
    
    // If any family exists, return its ID
    if (anyFamily) {
      return NextResponse.json({ familyId: anyFamily.id });
    }
    
    // If no family exists at all, create a minimal family record
    const newFamily = await prisma.family.create({
      data: {
        userId: session.user.id,
        // Optional fields can be filled later if needed
        emergencyContact: null,
        emergencyPhone: null
      },
      select: { id: true }
    });
    
    return NextResponse.json({ familyId: newFamily.id });
    
  } catch (error) {
    console.error("Error fetching family ID:", error);
    
    // Return a generic error message
    return NextResponse.json(
      { error: "Failed to retrieve family ID" },
      { status: 500 }
    );
  }
}
