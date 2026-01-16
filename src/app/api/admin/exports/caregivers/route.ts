import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { toCSV, caregiverExportColumns, buildDateFilter, generateExportFilename, formatExportDateTime, saveExportHistory } from '@/lib/export-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const certificationStatus = searchParams.get('certificationStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build filters
    const where: any = {};
    if (status) where.status = status;
    const dateFilter = buildDateFilter(startDate || undefined, endDate || undefined);
    if (dateFilter) where.createdAt = dateFilter;

    // Fetch caregivers
    const caregivers = await prisma.caregiver.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        certifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by certification status if needed
    let filteredCaregivers = caregivers;
    if (certificationStatus) {
      const now = new Date();
      filteredCaregivers = caregivers.filter(c => {
        const activeCerts = c.certifications.filter(cert => 
          cert.expiryDate && new Date(cert.expiryDate) > now
        );
        if (certificationStatus === 'CERTIFIED') return activeCerts.length > 0;
        if (certificationStatus === 'EXPIRED') return c.certifications.length > 0 && activeCerts.length === 0;
        if (certificationStatus === 'PENDING') return c.certifications.length === 0;
        return true;
      });
    }

    // Format data
    const formattedData = filteredCaregivers.map(c => ({
      id: c.id,
      'user.firstName': c.user?.firstName || '',
      'user.lastName': c.user?.lastName || '',
      'user.email': c.user?.email || '',
      'user.phone': c.user?.phone || '',
      status: c.status,
      yearsOfExperience: c.yearsOfExperience,
      hourlyRate: c.hourlyRate,
      specializations: Array.isArray(c.specializations) ? (c.specializations as string[]).join(', ') : '',
      languages: Array.isArray(c.languages) ? (c.languages as string[]).join(', ') : '',
      createdAt: formatExportDateTime(c.createdAt),
    }));

    // Return response based on format
    const filename = generateExportFilename('caregivers', format as 'csv' | 'json');

    // Build filters object for history
    const appliedFilters: Record<string, any> = {};
    if (status) appliedFilters.status = status;
    if (certificationStatus) appliedFilters.certificationStatus = certificationStatus;
    if (startDate) appliedFilters.startDate = startDate;
    if (endDate) appliedFilters.endDate = endDate;

    // Save export history
    await saveExportHistory({
      exportType: 'caregivers',
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
      'CAREGIVER',
      null,
      `Exported ${formattedData.length} caregivers`
    );
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = toCSV(formattedData, caregiverExportColumns);
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
