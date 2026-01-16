import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HomeStatus, CareLevel } from '@prisma/client';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

const updateHomeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  careLevel: z.array(z.enum(['INDEPENDENT', 'ASSISTED', 'MEMORY_CARE', 'SKILLED_NURSING'])).optional(),
  capacity: z.number().int().positive().optional(),
  currentOccupancy: z.number().int().min(0).optional(),
  genderRestriction: z.string().optional().nullable(),
  priceMin: z.number().positive().optional().nullable(),
  priceMax: z.number().positive().optional().nullable(),
  amenities: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: params.id },
      include: {
        operator: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
              },
            },
          },
        },
        address: true,
        licenses: {
          orderBy: { expiryDate: 'desc' },
        },
        inspections: {
          orderBy: { inspectionDate: 'desc' },
          take: 10,
        },
        residents: {
          include: {
            family: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        reviews: {
          include: {
            family: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        photos: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        inquiries: {
          include: {
            family: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Calculate metrics
    const occupancyRate = home.capacity > 0 
      ? ((home.currentOccupancy / home.capacity) * 100).toFixed(1)
      : '0';
    
    const activeResidents = home.residents.filter(r => r.status === 'ACTIVE').length;
    
    const averageRating = home.reviews.length > 0
      ? (home.reviews.reduce((sum, r) => sum + r.rating, 0) / home.reviews.length).toFixed(1)
      : null;
    
    const activeLicenses = home.licenses.filter(l => l.status === 'ACTIVE').length;
    
    const expiringLicenses = home.licenses.filter(l => {
      if (!l.expiryDate || l.status !== 'ACTIVE') return false;
      const daysUntilExpiry = Math.floor(
        (new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;

    const expiredLicenses = home.licenses.filter(l => 
      l.expiryDate && new Date(l.expiryDate) < new Date()
    ).length;

    const pendingInquiries = home.inquiries.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS').length;

    return NextResponse.json({
      ...home,
      metrics: {
        occupancyRate,
        activeResidents,
        averageRating,
        reviewCount: home.reviews.length,
        photoCount: home.photos.length,
        activeLicenses,
        expiringLicenses,
        expiredLicenses,
        totalLicenses: home.licenses.length,
        pendingInquiries,
        totalInquiries: home.inquiries.length,
        totalBookings: home.bookings.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch home:', error);
    return NextResponse.json(
      { error: 'Failed to fetch home', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateHomeSchema.parse(body);

    // Check if home exists
    const existingHome = await prisma.assistedLivingHome.findUnique({
      where: { id: params.id },
      include: { operator: true },
    });

    if (!existingHome) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Validate occupancy doesn't exceed capacity
    if (validatedData.currentOccupancy !== undefined && validatedData.capacity !== undefined) {
      if (validatedData.currentOccupancy > validatedData.capacity) {
        return NextResponse.json(
          { error: 'Current occupancy cannot exceed capacity' },
          { status: 400 }
        );
      }
    } else if (validatedData.currentOccupancy !== undefined) {
      if (validatedData.currentOccupancy > existingHome.capacity) {
        return NextResponse.json(
          { error: 'Current occupancy cannot exceed capacity' },
          { status: 400 }
        );
      }
    } else if (validatedData.capacity !== undefined) {
      if (existingHome.currentOccupancy > validatedData.capacity) {
        return NextResponse.json(
          { error: 'Capacity cannot be less than current occupancy' },
          { status: 400 }
        );
      }
    }

    // Update the home
    const updatedHome = await prisma.assistedLivingHome.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        operator: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        address: true,
        licenses: true,
        residents: true,
        reviews: true,
        photos: true,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      session.user.id,
      'AssistedLivingHome',
      params.id,
      existingHome,
      updatedHome,
      { adminAction: true }
    );

    return NextResponse.json(updatedHome);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to update home:', error);
    return NextResponse.json(
      { error: 'Failed to update home', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if home exists
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: params.id },
      include: {
        residents: true,
      },
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Check if home has active residents
    const activeResidents = home.residents.filter(r => r.status === 'ACTIVE');
    if (activeResidents.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete home with ${activeResidents.length} active resident(s)` },
        { status: 400 }
      );
    }

    // Delete the home (cascade will handle related records)
    await prisma.assistedLivingHome.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      session.user.id,
      'AssistedLivingHome',
      params.id,
      home,
      null,
      { adminAction: true, reason: 'Admin deletion' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete home:', error);
    return NextResponse.json(
      { error: 'Failed to delete home', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
