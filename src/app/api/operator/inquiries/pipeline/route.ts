/**
 * Inquiry Pipeline Dashboard API Endpoint
 * GET /api/operator/inquiries/pipeline
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireAuth, handleAuthError, getUserScope } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { getConversionStats } from '@/lib/services/inquiry-conversion';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { captureError } from '@/lib/sentry';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Check permission to view inquiries
    await requirePermission(PERMISSIONS.INQUIRIES_VIEW);

    // Get user scope
    const scope = await getUserScope(user.id);

    // Build where clause based on user role
    let whereClause: any = {};

    if (user.role === UserRole.OPERATOR && scope.homeIds.length > 0) {
      // Operators see only inquiries for their homes
      whereClause = {
        homeId: { in: scope.homeIds },
      };
    } else if (user.role === UserRole.FAMILY && scope.residentIds.length > 0) {
      // Families see only their own inquiries
      const family = await prisma.family.findUnique({
        where: { userId: user.id },
      });

      if (family) {
        whereClause = {
          familyId: family.id,
        };
      }
    }
    // Admins see all inquiries (no where clause)

    // Get conversion statistics scoped to operator.
    // scope.operatorId is the Operator record ID — getConversionStats filters by home.operatorId.
    // For a brand-new operator with no homes, return empty stats rather than platform-wide data.
    const stats = user.role === UserRole.OPERATOR
      ? (scope.operatorId
          ? await getConversionStats(scope.operatorId)
          : { total: 0, converted: 0, conversionRate: 0, byStatus: {} })
      : await getConversionStats(); // ADMIN: platform-wide

    // Get detailed pipeline data by status
    const pipeline = await prisma.inquiry.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        status: 'asc',
      },
    });

    // Get recent conversions
    const recentConversions = await prisma.inquiry.findMany({
      where: {
        ...whereClause,
        status: 'CONVERTED',
        conversionDate: { not: null },
      },
      take: 10,
      orderBy: {
        conversionDate: 'desc',
      },
      select: {
        id: true,
        conversionDate: true,
        family: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        home: {
          select: {
            name: true,
          },
        },
        convertedResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        convertedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get pipeline metrics (time in each stage)
    const stageMetrics = await Promise.all(
      ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTING'].map(async (status) => {
        const inquiries = await prisma.inquiry.findMany({
          where: {
            ...whereClause,
            status: status as any,
          },
          select: {
            createdAt: true,
            updatedAt: true,
          },
        });

        // Calculate average time in stage (days)
        const avgTime = inquiries.length > 0
          ? inquiries.reduce((sum, inquiry) => {
              const timeInStage = Date.now() - inquiry.updatedAt.getTime();
              return sum + timeInStage;
            }, 0) / inquiries.length / (1000 * 60 * 60 * 24)
          : 0;

        return {
          status,
          count: inquiries.length,
          avgDaysInStage: Math.round(avgTime * 10) / 10,
        };
      })
    );

    // Format pipeline data
    const pipelineData = pipeline.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total: stats.total,
        converted: stats.converted,
        conversionRate: stats.conversionRate,
        byStatus: stats.byStatus,
      },
      pipeline: pipelineData,
      stageMetrics,
      recentConversions,
    });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'operator:inquiries:pipeline' },
    });
    console.error('Pipeline API error:', error);
    return handleAuthError(error);
  }
}
