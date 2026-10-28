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
 * GET /api/reports/[id]
 * Get a specific report by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.view', 'analytics.view']);

    const report = await prisma.report.findUnique({
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

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (user.role !== 'ADMIN' && report.generatedBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this report' },
        { status: 403 }
      );
    }

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.READ,
      'Report',
      report.id,
      `Viewed report: ${report.title}`,
      undefined
    );

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/[id]
 * Delete a specific report
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate and authorize
    const user = await requireAuth();
    await requireAnyPermission(['reports.delete', 'reports.manage']);

    const report = await prisma.report.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (user.role !== 'ADMIN' && report.generatedBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this report' },
        { status: 403 }
      );
    }

    // Delete report
    await prisma.report.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      'Report',
      params.id,
      `Deleted report: ${report.title}`,
      undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete report' },
      { status: 500 }
    );
  }
}
