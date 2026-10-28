import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyPermission, getScopedWhereClause } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports
 * List all reports with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.view', 'analytics.view']);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const format = searchParams.get('format');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {
      ...(type ? { type } : {}),
      ...(format ? { format } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Apply scope if not admin
    if (user.role !== 'ADMIN') {
      where.generatedBy = user.id;
    }

    // Get total count
    const total = await prisma.report.count({ where });

    // Get reports
    const reports = await prisma.report.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
