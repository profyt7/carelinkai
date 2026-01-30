export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/shifts/open
 * 
 * Lists open shifts for authenticated caregivers
 * Requires authentication and caregiver role
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    
    // Ensure page and limit are valid
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    }
    
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Query open shifts with pagination
    const [shifts, total] = await Promise.all([
      prisma.caregiverShift.findMany({
        where: { 
          status: "OPEN",
          startTime: { gte: new Date() } // Only future shifts
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
        include: {
          home: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      }),
      prisma.caregiverShift.count({
        where: { 
          status: "OPEN",
          startTime: { gte: new Date() }
        }
      })
    ]);

    // Format shifts for response
    const formattedShifts = shifts.map(shift => {
      // Format address if available
      let address = "";
      if (shift.home?.address) {
        const { street, city, state } = shift.home.address;
        address = `${street ? street + ', ' : ''}${city}, ${state}`;
      }

      return {
        id: shift.id,
        homeId: shift.homeId,
        homeName: shift.home?.name || "Unknown",
        address,
        startTime: shift.startTime,
        endTime: shift.endTime,
        hourlyRate: shift.hourlyRate.toString(), // Convert Decimal to string
        status: shift.status
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // Return shifts with pagination metadata
    return NextResponse.json({
      shifts: formattedShifts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore
      }
    });

  } catch (error) {
    console.error("[SHIFTS API] Error fetching open shifts:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to fetch open shifts";
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = "Database query timed out. Please try again.";
      } else if (error.message.includes('connect')) {
        errorMessage = "Unable to connect to the database. Please try again later.";
      } else {
        // Log full error in development
        console.error("[SHIFTS API] Full error:", error.stack);
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
