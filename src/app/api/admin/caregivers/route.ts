import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const employmentType = searchParams.get('employmentType');
    const backgroundCheck = searchParams.get('backgroundCheck');
    const exportData = searchParams.get('export') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search by name, email, or phone
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by employment status
    if (status && status !== 'ALL') {
      where.employmentStatus = status;
    }

    // Filter by employment type
    if (employmentType && employmentType !== 'ALL') {
      where.employmentType = employmentType;
    }

    // Filter by background check status
    if (backgroundCheck && backgroundCheck !== 'ALL') {
      where.backgroundCheckStatus = backgroundCheck;
    }

    // For export, get all records without pagination
    const caregiverQuery = exportData
      ? prisma.caregiver.findMany({
          where,
          orderBy: { createdAt: 'desc' },
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
              select: { id: true },
            },
            assignments: {
              select: { id: true },
            },
            reviews: {
              select: { id: true, rating: true },
            },
          },
        })
      : prisma.caregiver.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
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
              select: { id: true },
            },
            assignments: {
              select: { id: true },
            },
            reviews: {
              select: { id: true, rating: true },
            },
          },
        });

    const [caregivers, totalCount] = await Promise.all([
      caregiverQuery,
      prisma.caregiver.count({ where }),
    ]);

    // Calculate average ratings and counts
    const caregiversWithStats = caregivers.map((caregiver) => {
      const ratings = caregiver.reviews.map((r) => r.rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      return {
        ...caregiver,
        certificationCount: caregiver.certifications.length,
        assignmentCount: caregiver.assignments.length,
        reviewCount: caregiver.reviews.length,
        rating: averageRating,
        // Remove the nested arrays from response
        certifications: undefined,
        assignments: undefined,
        reviews: undefined,
      };
    });

    // Handle export
    if (exportData) {
      // Convert to CSV
      const headers = [
        'ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'User Status',
        'Employment Status',
        'Employment Type',
        'Years Experience',
        'Hourly Rate',
        'Background Check',
        'Rating',
        'Reviews',
        'Assignments',
        'Certifications',
        'Created At',
      ];

      const rows = caregiversWithStats.map((c) => [
        c.id,
        c.user.firstName,
        c.user.lastName,
        c.user.email,
        c.user.phone || '',
        c.user.status,
        c.employmentStatus || '',
        c.employmentType || '',
        c.yearsExperience || '',
        c.hourlyRate || '',
        c.backgroundCheckStatus,
        c.rating?.toFixed(1) || '',
        c.reviewCount,
        c.assignmentCount,
        c.certificationCount,
        new Date(c.createdAt).toLocaleDateString(),
      ]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="caregivers-${new Date().toISOString()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      caregivers: caregiversWithStats,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('[Admin Caregivers API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
