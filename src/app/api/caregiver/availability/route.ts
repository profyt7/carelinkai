
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from "@/lib/rateLimit";

// Validation schemas
const createAvailabilitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAvailable: z.boolean().default(true),
  availableFor: z.array(z.string()).default([]),
  recurrence: z.enum(['none', 'daily', 'weekly']).optional().default('none'),
  recurrenceEnd: z.string().datetime().optional(),
});

const updateAvailabilitySchema = z.object({
  id: z.string(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isAvailable: z.boolean().optional(),
  availableFor: z.array(z.string()).optional(),
});

/**
 * GET /api/caregiver/availability
 * 
 * Get availability slots for the authenticated caregiver
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Rate limit: 60 req/min per IP
    {
      const key = getClientIp(request);
      const limit = 60;
      const rr = await rateLimitAsync({ name: 'caregiver:availability:GET', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is a caregiver
    if (session.user.role !== 'CAREGIVER') {
      return NextResponse.json({ error: "Only caregivers can access this endpoint" }, { status: 403 });
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build where clause
    const where: any = {
      userId: session.user.id
    };
    
    if (startDate && endDate) {
      where.startTime = { gte: new Date(startDate) };
      where.endTime = { lte: new Date(endDate) };
    }
    
    // Fetch availability slots
    const slots = await prisma.availabilitySlot.findMany({
      where,
      orderBy: { startTime: 'asc' }
    });
    
    return NextResponse.json({
      data: slots
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/caregiver/availability
 * 
 * Create new availability slots for the authenticated caregiver
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Rate limit: 30 req/min per IP
    {
      const key = getClientIp(request);
      const limit = 30;
      const rr = await rateLimitAsync({ name: 'caregiver:availability:POST', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is a caregiver
    if (session.user.role !== 'CAREGIVER') {
      return NextResponse.json({ error: "Only caregivers can access this endpoint" }, { status: 403 });
    }
    
    const body = await request.json();
    const validationResult = createAvailabilitySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { startTime, endTime, isAvailable, availableFor, recurrence, recurrenceEnd } = validationResult.data;
    
    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }
    
    // Create availability slots based on recurrence
    const slotsToCreate: any[] = [];
    
    if (recurrence === 'none') {
      slotsToCreate.push({
        userId: session.user.id,
        startTime: start,
        endTime: end,
        isAvailable,
        availableFor
      });
    } else if (recurrence === 'daily' || recurrence === 'weekly') {
      const increment = recurrence === 'daily' ? 1 : 7;
      const maxDate = recurrenceEnd ? new Date(recurrenceEnd) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days max
      
      let currentStart = new Date(start);
      let currentEnd = new Date(end);
      
      while (currentStart <= maxDate) {
        slotsToCreate.push({
          userId: session.user.id,
          startTime: new Date(currentStart),
          endTime: new Date(currentEnd),
          isAvailable,
          availableFor
        });
        
        currentStart.setDate(currentStart.getDate() + increment);
        currentEnd.setDate(currentEnd.getDate() + increment);
      }
    }
    
    // Create all slots
    const createdSlots = await prisma.availabilitySlot.createMany({
      data: slotsToCreate
    });
    
    return NextResponse.json({
      success: true,
      message: `Created ${createdSlots.count} availability slot(s)`,
      count: createdSlots.count
    });
  } catch (error) {
    console.error("Error creating availability:", error);
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/caregiver/availability
 * 
 * Update an existing availability slot
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Rate limit: 30 req/min per IP
    {
      const key = getClientIp(request);
      const limit = 30;
      const rr = await rateLimitAsync({ name: 'caregiver:availability:PUT', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is a caregiver
    if (session.user.role !== 'CAREGIVER') {
      return NextResponse.json({ error: "Only caregivers can access this endpoint" }, { status: 403 });
    }
    
    const body = await request.json();
    const validationResult = updateAvailabilitySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { id, ...updateData } = validationResult.data;
    
    // Check if slot exists and belongs to user
    const existingSlot = await prisma.availabilitySlot.findUnique({
      where: { id }
    });
    
    if (!existingSlot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }
    
    if (existingSlot.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this slot" },
        { status: 403 }
      );
    }
    
    // Update the slot
    const updatedSlot = await prisma.availabilitySlot.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      data: updatedSlot
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/caregiver/availability
 * 
 * Delete an availability slot
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Rate limit: 30 req/min per IP
    {
      const key = getClientIp(request);
      const limit = 30;
      const rr = await rateLimitAsync({ name: 'caregiver:availability:DELETE', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is a caregiver
    if (session.user.role !== 'CAREGIVER') {
      return NextResponse.json({ error: "Only caregivers can access this endpoint" }, { status: 403 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }
    
    // Check if slot exists and belongs to user
    const existingSlot = await prisma.availabilitySlot.findUnique({
      where: { id }
    });
    
    if (!existingSlot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }
    
    if (existingSlot.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this slot" },
        { status: 403 }
      );
    }
    
    // Delete the slot
    await prisma.availabilitySlot.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: "Availability slot deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting availability:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
