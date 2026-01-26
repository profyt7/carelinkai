export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { toCSV, userExportColumns, buildDateFilter, generateExportFilename, formatExportDateTime, saveExportHistory } from '@/lib/export-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build filters
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    const dateFilter = buildDateFilter(startDate || undefined, endDate || undefined);
    if (dateFilter) where.createdAt = dateFilter;

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data
    const formattedData = users.map(u => ({
      ...u,
      createdAt: formatExportDateTime(u.createdAt),
      lastLoginAt: formatExportDateTime(u.lastLoginAt),
    }));

    // Return response based on format
    const filename = generateExportFilename('users', format as 'csv' | 'json');
    
    // Build filters object for history
    const appliedFilters: Record<string, any> = {};
    if (role) appliedFilters.role = role;
    if (status) appliedFilters.status = status;
    if (startDate) appliedFilters.startDate = startDate;
    if (endDate) appliedFilters.endDate = endDate;

    // Save export history
    await saveExportHistory({
      exportType: 'users',
      fileName: filename,
      recordCount: users.length,
      filters: appliedFilters,
      format: format,
      exportedById: user.id,
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      user.id,
      AuditAction.EXPORT,
      'USER',
      null,
      `Exported ${users.length} users`
    );
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = toCSV(formattedData, userExportColumns);
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
