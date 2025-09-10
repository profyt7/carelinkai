import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Validate shift creation input
const shiftCreateSchema = z.object({
  homeId: z.string().min(1, "Home ID is required"),
  startTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Start time must be a valid date in ISO format",
  }),
  endTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "End time must be a valid date in ISO format",
  }),
  hourlyRate: z.union([
    z.number().positive("Hourly rate must be positive"),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Hourly rate must be a positive number",
    })
  ]),
  notes: z.string().optional(),
}).refine(data => {
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  return endTime > startTime;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

/**
 * POST /api/shifts
 * 
 * Creates a new shift for an operator's home
 * Requires authentication and operator role
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find operator record for current user
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!operator) {
      return NextResponse.json({ error: "User is not registered as an operator" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = shiftCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { homeId, startTime, endTime, hourlyRate, notes } = validationResult.data;
    
    // Verify the home belongs to this operator
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: { id: true, operatorId: true }
    });
    
    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }
    
    if (home.operatorId !== operator.id) {
      return NextResponse.json(
        { error: "You do not have permission to create shifts for this home" },
        { status: 403 }
      );
    }
    
    // Create shift
    const shift = await prisma.caregiverShift.create({
      data: {
        homeId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        hourlyRate: new Prisma.Decimal(hourlyRate.toString()),
        notes,
        status: "OPEN"
      }
    });
    
    // Return created shift
    return NextResponse.json({
      success: true,
      shift: {
        id: shift.id,
        homeId: shift.homeId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        hourlyRate: shift.hourlyRate.toString(),
        notes: shift.notes,
        status: shift.status
      }
    });
    
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
