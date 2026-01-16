import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { toCSV, residentExportColumns, buildDateFilter, generateExportFilename, formatExportDateTime, formatExportDate } from '@/lib/export-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const careLevel = searchParams.get('careLevel');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build filters
    const where: any = {};
    if (status) where.status = status;
    if (careLevel) where.careLevel = careLevel;
    const dateFilter = buildDateFilter(startDate || undefined, endDate || undefined);
    if (dateFilter) where.createdAt = dateFilter;

    // Fetch residents
    const residents = await prisma.resident.findMany({
      where,
      include: {
        home: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data
    const formattedData = residents.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth: formatExportDate(r.dateOfBirth),
      gender: r.gender,
      status: r.status,
      careLevel: r.careLevel,
      roomNumber: r.roomNumber,
      admissionDate: formatExportDate(r.admissionDate),
      'home.name': r.home?.name || '',
      createdAt: formatExportDateTime(r.createdAt),
    }));

    // Create audit log
    await createAuditLogFromRequest(
      req,
      user.id,
      AuditAction.EXPORT,
      'RESIDENT',
      null,
      `Exported ${formattedData.length} residents`
    );

    // Return response based on format
    const filename = generateExportFilename('residents', format as 'csv' | 'json');
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = toCSV(formattedData, residentExportColumns);
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
