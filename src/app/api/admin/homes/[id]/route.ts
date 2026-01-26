import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Admin Home Detail API] GET request for id:', id);
    
    // Debug: Check cookies being received
    const cookies = request.cookies.getAll();
    console.log('[Admin Home Detail API] Cookies received:', cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    
    // Try getServerSession first
    const session = await getServerSession(authOptions);
    console.log('[Admin Home Detail API] Session from getServerSession:', session ? {
      email: session.user?.email,
      role: session.user?.role,
      id: session.user?.id
    } : 'No session');
    
    // Also try getToken as fallback/debug
    const token = await getToken({ req: request });
    console.log('[Admin Home Detail API] Token from getToken:', token ? {
      email: token.email,
      role: token.role,
      id: token.id
    } : 'No token');

    // Use session if available, otherwise try token
    const userRole = session?.user?.role || (token?.role as string);
    const userId = session?.user?.id || (token?.id as string);
    const userEmail = session?.user?.email || (token?.email as string);
    
    // Check if user is admin
    if (!userRole || userRole !== 'ADMIN') {
      console.log('[Admin Home Detail API] Unauthorized - session:', !!session, 'token:', !!token, 'role:', userRole);
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasSession: !!session,
          hasToken: !!token,
          role: userRole || null,
          expectedRole: 'ADMIN',
          cookieCount: cookies.length,
          cookieNames: cookies.map(c => c.name)
        }
      }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
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
          orderBy: { expirationDate: 'desc' },
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
      if (!l.expirationDate || l.status !== 'ACTIVE') return false;
      const daysUntilExpiry = Math.floor(
        (new Date(l.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;

    const expiredLicenses = home.licenses.filter(l => 
      l.expirationDate && new Date(l.expirationDate) < new Date()
    ).length;

    const pendingInquiries = home.inquiries.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS').length;

    // Convert Prisma Decimal types to numbers for proper JSON serialization
    return NextResponse.json({
      ...home,
      priceMin: home.priceMin ? Number(home.priceMin) : null,
      priceMax: home.priceMax ? Number(home.priceMax) : null,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Admin Home Detail API] PATCH request for id:', id);
    
    const session = await getServerSession(authOptions);
    console.log('[Admin Home Detail API] PATCH Session:', session ? {
      email: session.user?.email,
      role: session.user?.role,
      id: session.user?.id
    } : 'No session');

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      console.log('[Admin Home Detail API] PATCH Unauthorized - session:', !!session, 'role:', session?.user?.role);
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasSession: !!session,
          role: session?.user?.role || null,
          expectedRole: 'ADMIN'
        }
      }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateHomeSchema.parse(body);

    // Check if home exists
    const existingHome = await prisma.assistedLivingHome.findUnique({
      where: { id },
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
      where: { id },
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
      id,
      existingHome,
      updatedHome,
      { adminAction: true }
    );

    // Convert Prisma Decimal types to numbers for proper JSON serialization
    return NextResponse.json({
      ...updatedHome,
      priceMin: updatedHome.priceMin ? Number(updatedHome.priceMin) : null,
      priceMax: updatedHome.priceMax ? Number(updatedHome.priceMax) : null,
    });
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

// Also export PUT as alias for PATCH (some clients may use PUT)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('[Admin Home Detail API] PUT request redirecting to PATCH');
  return PATCH(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Admin Home Detail API] DELETE request for id:', id);
    
    const session = await getServerSession(authOptions);
    console.log('[Admin Home Detail API] DELETE Session:', session ? {
      email: session.user?.email,
      role: session.user?.role,
      id: session.user?.id
    } : 'No session');

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      console.log('[Admin Home Detail API] DELETE Unauthorized - session:', !!session, 'role:', session?.user?.role);
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasSession: !!session,
          role: session?.user?.role || null,
          expectedRole: 'ADMIN'
        }
      }, { status: 403 });
    }

    // Check if home exists
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
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
      where: { id },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      session.user.id,
      'AssistedLivingHome',
      id,
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
