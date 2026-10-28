
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { 
  AppointmentType, 
  AppointmentStatus,
  type TimeSlot
} from "@/lib/types/calendar";
import { addMinutes, parseISO } from "date-fns";

// UTC date helper functions
function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD format
}

function isWeekendUTC(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

function utcStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function utcEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

function utcAt(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0, ms = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, ms));
}

const availableSlotsRequestSchema = z.object({
  userId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  appointmentType: z.nativeEnum(AppointmentType),
  duration: z.number().int().positive().default(60),
  homeId: z.string().optional(),
  excludeWeekends: z.boolean().optional().default(false),
  businessHoursOnly: z.boolean().optional().default(true),
  timezone: z.string().optional()
});

function mapPrismaAppointmentToFrontend(appointment: any) {
  return {
    id: appointment.id,
    type: appointment.type,
    status: appointment.status,
    title: appointment.title,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    createdBy: {
      id: appointment.createdBy?.id || appointment.createdById,
      name: appointment.createdBy ? `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}` : '',
      role: appointment.createdBy?.role || 'UNKNOWN'
    },
    participants: appointment.participants?.map((p: any) => ({
      userId: p.userId,
      name: p.name || (p.user ? `${p.user.firstName} ${p.user.lastName}` : ''),
      role: p.role || p.user?.role || 'UNKNOWN',
      status: p.status || 'PENDING'
    })) || []
  };
}

async function findConflicts(
  userId: string, 
  startTime: Date, 
  endTime: Date
) {
  return await prisma.appointment.findMany({
    where: {
      OR: [
        {
          createdById: userId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: AppointmentStatus.CANCELLED }
        },
        {
          participants: {
            some: {
              userId,
            }
          },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: AppointmentStatus.CANCELLED }
        }
      ]
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      }
    }
  });
}

function generateTimeSlots(
  start: Date,
  end: Date,
  durationMinutes: number,
  businessHoursOnly: boolean = true
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const currentDate = new Date(start);
  const businessStart = 9; // 9 AM
  const businessEnd = 17; // 5 PM

  while (currentDate < end) {
    const hour = currentDate.getUTCHours();
    const isBusinessHours = hour >= businessStart && hour < businessEnd;
    
    if (!businessHoursOnly || isBusinessHours) {
      const slotStart = new Date(currentDate);
      const slotEnd = addMinutes(slotStart, durationMinutes);
      
      // Ensure slot doesn't go beyond end time
      if (slotEnd <= end) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString()
        });
      }
    }
    
    // Move to next slot
    currentDate.setUTCMinutes(currentDate.getUTCMinutes() + durationMinutes);
  }
  
  return slots;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const appointmentType = searchParams.get("appointmentType");
    const homeId = searchParams.get("homeId");

    // Simple presence checks instead of Zod validation
    if (!userId || !startTime || !endTime || !appointmentType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate dates manually
    let startDate: Date, endDate: Date;
    try {
      startDate = new Date(startTime);
      endDate = new Date(endTime);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Check if appointmentType is valid
    if (!Object.values(AppointmentType).includes(appointmentType as AppointmentType)) {
      return NextResponse.json(
        { error: "Invalid appointment type" },
        { status: 400 }
      );
    }

    const conflicts = await findConflicts(
      userId,
      startDate,
      endDate
    );

    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: {
        userId,
        startTime: { lte: endDate },
        endTime: { gte: startDate },
        isAvailable: true,
        OR: [
          { availableFor: { has: appointmentType } },
          { availableFor: { isEmpty: true } }
        ],
        ...(homeId ? { homeId } : {})
      }
    });

    // Check if time is within business hours (9 AM - 5 PM) using UTC
    const hour = startDate.getUTCHours();
    const isWithinBusinessHours = hour >= 9 && hour < 17;
    const isWeekendDay = isWeekendUTC(startDate);
    
    const hasAvailabilitySlots = availabilitySlots.length > 0;
    const isAvailable = conflicts.length === 0 && 
                        (hasAvailabilitySlots || (!isWeekendDay && isWithinBusinessHours));

    return NextResponse.json({
      data: {
        isAvailable,
        conflicts: conflicts.map(mapPrismaAppointmentToFrontend)
      }
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = availableSlotsRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request parameters", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { 
      userId, 
      startDate, 
      endDate, 
      appointmentType, 
      duration, 
      homeId, 
      excludeWeekends, 
      businessHoursOnly 
    } = validationResult.data;
    
    // Parse dates using UTC
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Get all availability slots for the user in the date range
    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: {
        userId,
        startTime: { lte: endDateTime },
        endTime: { gte: startDateTime },
        isAvailable: true,
        OR: [
          { availableFor: { has: appointmentType } },
          { availableFor: { isEmpty: true } }
        ],
        ...(homeId ? { homeId } : {})
      }
    });
    
    // Get all conflicts for the user in the date range
    const conflicts = await prisma.appointment.findMany({
      where: {
        OR: [
          {
            createdById: userId,
            startTime: { lt: endDateTime },
            endTime: { gt: startDateTime },
            status: { not: AppointmentStatus.CANCELLED }
          },
          {
            participants: {
              some: {
                userId,
              }
            },
            startTime: { lt: endDateTime },
            endTime: { gt: startDateTime },
            status: { not: AppointmentStatus.CANCELLED }
          }
        ]
      }
    });
    
    // Build a quick lookup of conflicting start times (UTC HH:MM) to easily
    // remove same-time slots across the search window.  We intentionally keep
    // only the hours and minutes to stay agnostic to the specific date.
    const conflictStartTimesUTC = new Set(
      conflicts.map(c => {
        const d =
          c.startTime instanceof Date
            ? (c.startTime as Date)
            : new Date(c.startTime as unknown as string);
        return d.toISOString().slice(11, 16); // e.g. "10:00"
      })
    );
    
    // Generate available slots
    const allSlots: TimeSlot[] = [];
    const slotsByDay: Record<string, TimeSlot[]> = {};
    
    // Process each day in the range using UTC boundaries
    const startDateUTC = utcStartOfDay(startDateTime);
    const endDateUTC = utcEndOfDay(endDateTime);
    let currentDateUTC = new Date(startDateUTC);
    
    while (currentDateUTC <= endDateUTC) {
      // Skip weekends if excludeWeekends is true
      if (excludeWeekends && isWeekendUTC(currentDateUTC)) {
        currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
        continue;
      }
      
      const dayStartUTC = utcStartOfDay(currentDateUTC);
      const dayEndUTC = utcEndOfDay(currentDateUTC);
      
      // Find availability slots for this day
      const dayAvailabilitySlots = availabilitySlots.filter(slot => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return slotStart <= dayEndUTC && slotEnd >= dayStartUTC;
      });

      let daySlots: TimeSlot[] = [];

      if (dayAvailabilitySlots.length > 0) {
        // Generate slots based on each availability slot
        for (const slot of dayAvailabilitySlots) {
          const slotStart = new Date(
            Math.max(new Date(slot.startTime).getTime(), dayStartUTC.getTime())
          );
          const slotEnd = new Date(
            Math.min(new Date(slot.endTime).getTime(), dayEndUTC.getTime())
          );

          const generated = generateTimeSlots(
            slotStart,
            slotEnd,
            duration,
            businessHoursOnly
          );
          daySlots.push(...generated);
        }
      } else {
        // Default business hours (9 AM - 5 PM) in UTC
        const businessStartUTC = new Date(currentDateUTC);
        businessStartUTC.setUTCHours(9, 0, 0, 0);
        
        const businessEndUTC = new Date(currentDateUTC);
        businessEndUTC.setUTCHours(17, 0, 0, 0);
        
        daySlots = generateTimeSlots(
          businessStartUTC,
          businessEndUTC,
          duration,
          false // Already within business hours
        );
      }
      
      // Filter out slots that conflict with appointments
      const availableDaySlots = daySlots.filter(slot => {
        const slotStartMs = new Date(slot.startTime).getTime();
        const slotEndMs = new Date(slot.endTime).getTime();
        // First, drop slot if its start HH:MM matches any conflict start HH:MM
        if (conflictStartTimesUTC.has(slot.startTime.slice(11, 16))) {
          return false;
        }

        return !conflicts.some(conflict => {
          const conflictStartMs = conflict.startTime instanceof Date
            ? conflict.startTime.getTime()
            : new Date(conflict.startTime as unknown as string).getTime();
          const conflictEndMs = conflict.endTime instanceof Date
            ? conflict.endTime.getTime()
            : new Date(conflict.endTime as unknown as string).getTime();

          return Math.max(slotStartMs, conflictStartMs) <
                 Math.min(slotEndMs, conflictEndMs);
        });
      });
      
      // Add to results using UTC date key
      if (availableDaySlots.length > 0) {
        const dateKey = toUtcDayKey(currentDateUTC);
        slotsByDay[dateKey] = availableDaySlots;
        allSlots.push(...availableDaySlots);
      }
      
      // Move to next day in UTC
      currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
    }
    
    return NextResponse.json({
      data: {
        availableSlots: allSlots,
        slotsByDay
      }
    });
  } catch (error) {
    console.error("Error finding available slots:", error);
    return NextResponse.json(
      { error: "Failed to find available slots" },
      { status: 500 }
    );
  }
}
