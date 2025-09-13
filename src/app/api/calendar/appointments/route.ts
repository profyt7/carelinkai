import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { 
  AppointmentType, 
  AppointmentStatus,
  type Appointment,
  type TimeSlot,
  type BookingRequest,
  type BookingResponse
} from "@/lib/types/calendar";

const appointmentCreateSchema = z.object({
  type: z.nativeEnum(AppointmentType),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.object({
    address: z.string().optional(),
    room: z.string().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }).optional(),
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string(),
    name: z.string().optional(),
    role: z.string().optional(),
    status: z.string().default("PENDING")
  })).optional(),
  recurrence: z.object({
    frequency: z.string(),
    daysOfWeek: z.array(z.string()).optional(),
    dayOfMonth: z.number().optional(),
    monthOfYear: z.number().optional(),
    endDate: z.string().optional(),
    occurrences: z.number().optional(),
    customRule: z.string().optional(),
    excludeDates: z.array(z.string()).optional()
  }).optional(),
  reminders: z.array(z.object({
    minutesBefore: z.number(),
    method: z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"])
  })).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional()
});

const bookingRequestSchema = z.object({
  type: z.nativeEnum(AppointmentType),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  requestedStartTime: z.string().datetime(),
  requestedEndTime: z.string().datetime(),
  alternativeTimeSlots: z.array(z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
  })).optional(),
  location: z.object({
    address: z.string().optional(),
    room: z.string().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }).optional(),
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string(),
    name: z.string().optional(),
    role: z.string().optional(),
    required: z.boolean().default(true)
  })).optional(),
  recurrence: z.object({
    frequency: z.string(),
    daysOfWeek: z.array(z.string()).optional(),
    dayOfMonth: z.number().optional(),
    monthOfYear: z.number().optional(),
    endDate: z.string().optional(),
    occurrences: z.number().optional(),
    customRule: z.string().optional(),
    excludeDates: z.array(z.string()).optional()
  }).optional(),
  reminders: z.array(z.object({
    minutesBefore: z.number(),
    method: z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"])
  })).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional()
});

const appointmentUpdateSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AppointmentType).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  location: z.object({
    address: z.string().optional(),
    room: z.string().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }).optional(),
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string(),
    name: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional()
  })).optional(),
  notes: z.string().optional(),
  updateMode: z.enum(['THIS_ONLY', 'THIS_AND_FUTURE', 'ALL']).optional().default('THIS_ONLY')
});

const appointmentCancelSchema = z.object({
  reason: z.string().optional(),
  cancelMode: z.enum(['THIS_ONLY', 'THIS_AND_FUTURE', 'ALL']).optional().default('THIS_ONLY')
});

function mapPrismaAppointmentToFrontend(
  appointment: any,
  includeParticipants = true
): Appointment {
  return {
    id: appointment.id,
    type: appointment.type,
    status: appointment.status,
    title: appointment.title,
    description: appointment.description || undefined,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    location: appointment.location || undefined,
    homeId: appointment.homeId || undefined,
    residentId: appointment.residentId || undefined,
    createdBy: {
      id: appointment.createdBy?.id || appointment.createdById,
      name: appointment.createdBy ? `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}` : '',
      role: appointment.createdBy?.role || 'UNKNOWN'
    },
    participants: includeParticipants 
      ? (appointment.participants?.map((p: any) => ({
          userId: p.userId,
          name: p.name || (p.user ? `${p.user.firstName} ${p.user.lastName}` : ''),
          role: p.role || p.user?.role || 'UNKNOWN',
          status: p.status || 'PENDING',
          notes: p.notes
        })) || [])
      : [],
    recurrence: appointment.recurrence || undefined,
    reminders: appointment.reminders || undefined,
    notes: appointment.notes || undefined,
    customFields: appointment.customFields || undefined,
    metadata: {
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString()
    }
  };
}

async function checkForConflicts(
  userId: string, 
  startTime: Date, 
  endTime: Date, 
  excludeAppointmentId?: string
): Promise<boolean> {
  const overlappingAppointments = await prisma.appointment.findMany({
    where: {
      OR: [
        {
          createdById: userId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: AppointmentStatus.CANCELLED },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
        },
        {
          participants: {
            some: {
              userId,
            }
          },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: AppointmentStatus.CANCELLED },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
        }
      ]
    }
  });
  
  return overlappingAppointments.length > 0;
}

async function checkParticipantConflicts(
  participantIds: string[],
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<{ hasConflicts: boolean, conflicts: any[] }> {
  const overlappingAppointments = await prisma.appointment.findMany({
    where: {
      OR: [
        {
          createdById: { in: participantIds },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: AppointmentStatus.CANCELLED },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
        },
        {
          participants: {
            some: {
              userId: { in: participantIds }
            }
          },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: AppointmentStatus.CANCELLED },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
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
  
  return { 
    hasConflicts: overlappingAppointments.length > 0,
    conflicts: overlappingAppointments.map(appt => mapPrismaAppointmentToFrontend(appt))
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const appointmentId = searchParams.get("id");

    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
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

      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      return NextResponse.json({
        data: mapPrismaAppointmentToFrontend(appointment)
      });
    } else {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const types = searchParams.getAll("type");
      const statuses = searchParams.getAll("status");
      const homeId = searchParams.get("homeId");
      const residentId = searchParams.get("residentId");
      const participantId = searchParams.get("participantId");
      const search = searchParams.get("search");

      const whereClause: any = {};

      if (startDate) {
        whereClause.startTime = { gte: new Date(startDate) };
      }

      if (endDate) {
        whereClause.endTime = { lte: new Date(endDate) };
      }

      if (types.length > 0) {
        whereClause.type = { in: types };
      }

      if (statuses.length > 0) {
        whereClause.status = { in: statuses };
      }

      if (homeId) {
        whereClause.homeId = homeId;
      }

      if (residentId) {
        whereClause.residentId = residentId;
      }

      if (participantId) {
        whereClause.OR = [
          { createdById: participantId },
          { participants: { some: { userId: participantId } } }
        ];
      } else {
        whereClause.OR = [
          { createdById: session.user.id },
          { participants: { some: { userId: session.user.id } } }
        ];
      }

      if (search) {
        whereClause.OR = [
          ...(whereClause.OR || []),
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
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
        },
        orderBy: { startTime: 'asc' }
      });

      return NextResponse.json({
        data: appointments.map(appointment => mapPrismaAppointmentToFrontend(appointment))
      });
    }
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
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
    const isBookingRequest = 'requestedStartTime' in body;

    if (isBookingRequest) {
      const validationResult = bookingRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            error: "Invalid request parameters", 
            details: validationResult.error.format() 
          },
          { status: 400 }
        );
      }

      const bookingData = validationResult.data;
      const startTime = new Date(bookingData.requestedStartTime);
      const endTime = new Date(bookingData.requestedEndTime);
      
      const participantIds = [
        session.user.id,
        ...(bookingData.participants?.map(p => p.userId) || [])
      ];
      
      const { hasConflicts, conflicts } = await checkParticipantConflicts(
        participantIds,
        startTime,
        endTime
      );
      
      if (hasConflicts) {
        return NextResponse.json({
          success: false,
          error: "Time slot conflicts with existing appointments",
          conflicts,
          alternativeSlots: [] // Would be populated in a more advanced implementation
        });
      }
      
      const appointment = await prisma.appointment.create({
        data: {
          type: bookingData.type,
          status: AppointmentStatus.CONFIRMED,
          title: bookingData.title,
          description: bookingData.description,
          startTime,
          endTime,
          location: bookingData.location,
          homeId: bookingData.homeId,
          residentId: bookingData.residentId,
          createdById: session.user.id,
          recurrence: bookingData.recurrence,
          reminders: bookingData.reminders,
          notes: bookingData.notes,
          customFields: bookingData.customFields
        }
      });
      
      if (bookingData.participants && bookingData.participants.length > 0) {
        await prisma.appointmentParticipant.createMany({
          data: bookingData.participants.map(p => ({
            appointmentId: appointment.id,
            userId: p.userId,
            name: p.name,
            role: p.role as any,
            status: "PENDING"
          }))
        });
      }
      
      const createdAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
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
      
      return NextResponse.json({
        success: true,
        data: mapPrismaAppointmentToFrontend(createdAppointment!)
      });
    } else {
      const validationResult = appointmentCreateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            error: "Invalid request parameters", 
            details: validationResult.error.format() 
          },
          { status: 400 }
        );
      }
      
      const appointmentData = validationResult.data;
      
      const appointment = await prisma.appointment.create({
        data: {
          type: appointmentData.type,
          status: AppointmentStatus.PENDING,
          title: appointmentData.title,
          description: appointmentData.description,
          startTime: new Date(appointmentData.startTime),
          endTime: new Date(appointmentData.endTime),
          location: appointmentData.location,
          homeId: appointmentData.homeId,
          residentId: appointmentData.residentId,
          createdById: session.user.id,
          recurrence: appointmentData.recurrence,
          reminders: appointmentData.reminders,
          notes: appointmentData.notes,
          customFields: appointmentData.customFields
        }
      });
      
      if (appointmentData.participants && appointmentData.participants.length > 0) {
        await prisma.appointmentParticipant.createMany({
          data: appointmentData.participants.map(p => ({
            appointmentId: appointment.id,
            userId: p.userId,
            name: p.name,
            role: p.role as any,
            status: p.status || "PENDING"
          }))
        });
      }
      
      const createdAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
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
      
      return NextResponse.json({
        data: mapPrismaAppointmentToFrontend(createdAppointment!)
      });
    }
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = appointmentUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request parameters", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { id, updateMode, participants, ...updateData } = validationResult.data;
    
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { participants: true }
    });
    
    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    const isOnlyNotesUpdate = Object.keys(updateData).length === 1 && 'notes' in updateData;
    
    if (isOnlyNotesUpdate) {
      updateData.status = AppointmentStatus.COMPLETED;
    }
    
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
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
    
    if (participants) {
      await prisma.appointmentParticipant.deleteMany({
        where: { appointmentId: id }
      });
      
      if (participants.length > 0) {
        await prisma.appointmentParticipant.createMany({
          data: participants.map(p => ({
            appointmentId: id,
            userId: p.userId,
            name: p.name,
            role: p.role as any,
            status: p.status || "PENDING"
          }))
        });
      }
      
      // Re-fetch if participants were updated
      const refreshedAppointment = await prisma.appointment.findUnique({
        where: { id },
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
      
      if (refreshedAppointment) {
        updatedAppointment.participants = refreshedAppointment.participants;
      }
    }
    
    const mappedAppointment = mapPrismaAppointmentToFrontend(updatedAppointment);
    
    if (isOnlyNotesUpdate) {
      mappedAppointment.metadata.completedAt = new Date().toISOString();
      mappedAppointment.metadata.completionNotes = updateData.notes;
    }
    
    return NextResponse.json({ data: mappedAppointment });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }
    
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });
    
    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    let cancelData: { reason?: string; cancelMode?: string } = {};
    
    if (request.method === 'DELETE' && request.body) {
      const body = await request.json();
      const validationResult = appointmentCancelSchema.safeParse(body);
      
      if (validationResult.success) {
        cancelData = validationResult.data;
      }
    }
    
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
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
    
    const mappedAppointment = mapPrismaAppointmentToFrontend(updatedAppointment);
    
    mappedAppointment.status = AppointmentStatus.CANCELLED;
    mappedAppointment.metadata.cancelledAt = new Date().toISOString();
    mappedAppointment.metadata.cancelReason = cancelData.reason;
    
    return NextResponse.json({ data: mappedAppointment });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}
