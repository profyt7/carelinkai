import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyPermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/scheduled
 * List all scheduled reports
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.schedule', 'reports.view']);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const enabled = searchParams.get('enabled');

    // Build where clause
    const where: any = {
      ...(enabled !== null && enabled !== undefined
        ? { enabled: enabled === 'true' }
        : {}),
    };

    // Apply scope if not admin
    if (user.role !== 'ADMIN') {
      where.createdBy = user.id;
    }

    // Get total count
    const total = await prisma.scheduledReport.count({ where });

    // Get scheduled reports
    const scheduledReports = await prisma.scheduledReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
      scheduledReports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching scheduled reports:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch scheduled reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/scheduled
 * Create a new scheduled report
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.schedule', 'reports.manage']);

    const body = await request.json();
    const {
      title,
      type,
      format = 'PDF',
      schedule,
      dayOfWeek,
      dayOfMonth,
      time,
      recipients,
      config,
      enabled = true,
    } = body;

    // Validate required fields
    if (!title || !type || !schedule || !time || !recipients?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate schedule-specific fields
    if (schedule === 'WEEKLY' && (dayOfWeek === null || dayOfWeek === undefined)) {
      return NextResponse.json(
        { error: 'Day of week is required for weekly schedule' },
        { status: 400 }
      );
    }

    if (schedule === 'MONTHLY' && !dayOfMonth) {
      return NextResponse.json(
        { error: 'Day of month is required for monthly schedule' },
        { status: 400 }
      );
    }

    // Calculate next run time (simplified)
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1); // Run tomorrow for now

    // Create scheduled report
    const scheduledReport = await prisma.scheduledReport.create({
      data: {
        title,
        type,
        format,
        schedule,
        dayOfWeek,
        dayOfMonth,
        time,
        recipients,
        config: config || {},
        enabled,
        nextRun,
        createdBy: user.id,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.REPORT_SCHEDULED,
      resourceType: 'ScheduledReport',
      resourceId: scheduledReport.id,
      details: `Scheduled ${type} report: ${title}`,
    });

    return NextResponse.json({
      success: true,
      scheduledReport,
    });
  } catch (error: any) {
    console.error('Error creating scheduled report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create scheduled report' },
      { status: 500 }
    );
  }
}
