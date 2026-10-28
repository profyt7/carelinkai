import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyPermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/reports/scheduled/[id]
 * Get a specific scheduled report
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.schedule', 'reports.view']);

    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
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

    if (!scheduledReport) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (user.role !== 'ADMIN' && scheduledReport.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this scheduled report' },
        { status: 403 }
      );
    }

    return NextResponse.json({ scheduledReport });
  } catch (error: any) {
    console.error('Error fetching scheduled report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch scheduled report' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reports/scheduled/[id]
 * Update a scheduled report
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.schedule', 'reports.manage']);

    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
    });

    if (!scheduledReport) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (user.role !== 'ADMIN' && scheduledReport.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this scheduled report' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    // Only update provided fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.documentType !== undefined) updateData.type = body.documentType;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek;
    if (body.dayOfMonth !== undefined) updateData.dayOfMonth = body.dayOfMonth;
    if (body.time !== undefined) updateData.time = body.time;
    if (body.recipients !== undefined) updateData.recipients = body.recipients;
    if (body.config !== undefined) updateData.config = body.config;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const updated = await prisma.scheduledReport.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      'ScheduledReport',
      params.id,
      `Updated scheduled report: ${updated.title}`,
      undefined
    );

    return NextResponse.json({
      success: true,
      scheduledReport: updated,
    });
  } catch (error: any) {
    console.error('Error updating scheduled report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update scheduled report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/scheduled/[id]
 * Delete a scheduled report
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.schedule', 'reports.manage']);

    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
    });

    if (!scheduledReport) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (user.role !== 'ADMIN' && scheduledReport.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this scheduled report' },
        { status: 403 }
      );
    }

    // Delete scheduled report
    await prisma.scheduledReport.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      'ScheduledReport',
      params.id,
      `Deleted scheduled report: ${scheduledReport.title}`,
      undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
}
