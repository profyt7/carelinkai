import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyPermission } from '@/lib/auth-utils';
import { generateReport } from '@/lib/services/reports';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reports/generate
 * Generate a report based on configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission([
      'reports.generate',
      'reports.view',
      'analytics.view',
    ]);

    const body = await request.json();
    const {
      type,
      title,
      format = 'PDF',
      startDate,
      endDate,
      homeIds,
      includeCharts = true,
      includeSummary = true,
      includeDetails = true,
    } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Report title is required' },
        { status: 400 }
      );
    }

    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : subMonths(new Date(), 1);
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    // Generate report data
    const reportData = await generateReport(type, {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      homeIds: homeIds || [],
      includeCharts,
      includeSummary,
      includeDetails,
    });

    // Save report to database
    const report = await prisma.report.create({
      data: {
        title,
        type,
        format,
        config: {
          startDate: parsedStartDate.toISOString(),
          endDate: parsedEndDate.toISOString(),
          homeIds: homeIds || [],
          includeCharts,
          includeSummary,
          includeDetails,
        },
        generatedBy: user.id,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.REPORT_GENERATED,
      resourceType: 'Report',
      resourceId: report.id,
      details: `Generated ${type} report: ${title}`,
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        format: report.format,
        createdAt: report.createdAt,
      },
      data: reportData,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
