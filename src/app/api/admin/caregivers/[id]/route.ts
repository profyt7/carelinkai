import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateCaregiverSchema = z.object({
  backgroundCheckStatus: z.enum(['NOT_STARTED', 'PENDING', 'CLEAR', 'CONSIDER', 'EXPIRED']).optional(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'PER_DIEM', 'CONTRACT']).optional(),
  hourlyRate: z.number().nullable().optional(),
  yearsExperience: z.number().nullable().optional(),
  bio: z.string().optional(),
  isVisibleInMarketplace: z.boolean().optional(),
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

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        certifications: {
          select: {
            id: true,
            certificationType: true,
            certificationName: true,
            issueDate: true,
            expiryDate: true,
            status: true,
          },
          orderBy: { issueDate: 'desc' },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            title: true,
            uploadDate: true,
            expiryDate: true,
          },
          orderBy: { uploadDate: 'desc' },
        },
        assignments: {
          select: {
            id: true,
            resident: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            isPrimary: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { startDate: 'desc' },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!caregiver) {
      return NextResponse.json({ error: 'Caregiver not found' }, { status: 404 });
    }

    // Calculate stats
    const ratings = caregiver.reviews.map((r) => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

    const result = {
      ...caregiver,
      averageRating,
      reviewCount: caregiver.reviews.length,
      assignmentCount: caregiver.assignments.length,
      certificationCount: caregiver.certifications.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Caregiver Detail API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
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
    const validatedData = updateCaregiverSchema.parse(body);

    // Update the caregiver
    const updatedCaregiver = await prisma.caregiver.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        certifications: {
          select: {
            id: true,
            certificationType: true,
            certificationName: true,
            issueDate: true,
            expiryDate: true,
            status: true,
          },
          orderBy: { issueDate: 'desc' },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            title: true,
            uploadDate: true,
            expiryDate: true,
          },
          orderBy: { uploadDate: 'desc' },
        },
        assignments: {
          select: {
            id: true,
            resident: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            isPrimary: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { startDate: 'desc' },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Calculate stats
    const ratings = updatedCaregiver.reviews.map((r) => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

    const result = {
      ...updatedCaregiver,
      averageRating,
      reviewCount: updatedCaregiver.reviews.length,
      assignmentCount: updatedCaregiver.assignments.length,
      certificationCount: updatedCaregiver.certifications.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Admin Caregiver Update API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
