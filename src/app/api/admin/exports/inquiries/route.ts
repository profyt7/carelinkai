import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { toCSV, inquiryExportColumns, buildDateFilter, generateExportFilename, formatExportDateTime, saveExportHistory } from '@/lib/export-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build filters
    const where: any = {};
    if (status) where.status = status;
    if (source) where.source = source;
    const dateFilter = buildDateFilter(startDate || undefined, endDate || undefined);
    if (dateFilter) where.createdAt = dateFilter;

    // Fetch inquiries
    const inquiries = await prisma.inquiry.findMany({
      where,
      include: {
        home: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data
    const formattedData = inquiries.map(i => ({
      id: i.id,
      contactName: i.contactName,
      contactEmail: i.contactEmail,
      contactPhone: i.contactPhone,
      residentName: i.residentName,
      relationship: i.relationship,
      status: i.status,
      source: i.source,
      urgency: i.urgency,
      careLevel: i.careLevel,
      budget: i.budget,
      notes: i.notes,
      'home.name': i.home?.name || '',
      createdAt: formatExportDateTime(i.createdAt),
    }));

    // Return response based on format
    const filename = generateExportFilename('inquiries', format as 'csv' | 'json');

    // Build filters object for history
    const appliedFilters: Record<string, any> = {};
    if (status) appliedFilters.status = status;
    if (source) appliedFilters.source = source;
    if (startDate) appliedFilters.startDate = startDate;
    if (endDate) appliedFilters.endDate = endDate;

    // Save export history
    await saveExportHistory({
      exportType: 'inquiries',
      fileName: filename,
      recordCount: formattedData.length,
      filters: appliedFilters,
      format: format,
      exportedById: user.id,
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      user.id,
      AuditAction.EXPORT,
      'INQUIRY',
      null,
      `Exported ${formattedData.length} inquiries`
    );
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = toCSV(formattedData, inquiryExportColumns);
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
