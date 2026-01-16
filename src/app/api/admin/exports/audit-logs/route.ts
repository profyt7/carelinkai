import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { toCSV, auditLogExportColumns, buildDateFilter, generateExportFilename, formatExportDateTime, saveExportHistory } from '@/lib/export-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build filters
    const where: any = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    const dateFilter = buildDateFilter(startDate || undefined, endDate || undefined);
    if (dateFilter) where.createdAt = dateFilter;

    // Fetch audit logs (limit to 10000 for performance)
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    // Format data
    const formattedData = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      description: log.description,
      'user.email': log.user?.email || '',
      'user.firstName': log.user?.firstName || '',
      'user.lastName': log.user?.lastName || '',
      ipAddress: log.ipAddress,
      createdAt: formatExportDateTime(log.createdAt),
    }));

    // Return response based on format
    const filename = generateExportFilename('audit-logs', format as 'csv' | 'json');

    // Build filters object for history
    const appliedFilters: Record<string, any> = {};
    if (action) appliedFilters.action = action;
    if (resourceType) appliedFilters.resourceType = resourceType;
    if (startDate) appliedFilters.startDate = startDate;
    if (endDate) appliedFilters.endDate = endDate;

    // Save export history
    await saveExportHistory({
      exportType: 'audit-logs',
      fileName: filename,
      recordCount: formattedData.length,
      filters: appliedFilters,
      format: format,
      exportedById: user.id,
    });

    // Create audit log for this export
    await createAuditLogFromRequest(
      req,
      user.id,
      AuditAction.EXPORT,
      'AUDIT_LOG',
      null,
      `Exported ${formattedData.length} audit logs`
    );
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = toCSV(formattedData, auditLogExportColumns);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
