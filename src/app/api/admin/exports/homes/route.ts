import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { toCSV, homeExportColumns, buildDateFilter, generateExportFilename, formatExportDateTime } from '@/lib/export-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build filters
    const where: any = {};
    if (status) where.status = status;
    const dateFilter = buildDateFilter(startDate || undefined, endDate || undefined);
    if (dateFilter) where.createdAt = dateFilter;

    // Fetch homes
    const homes = await prisma.assistedLivingHome.findMany({
      where,
      include: {
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by city/state if provided (from address)
    let filteredHomes = homes;
    if (city) {
      filteredHomes = filteredHomes.filter(h => 
        h.address?.city?.toLowerCase().includes(city.toLowerCase())
      );
    }
    if (state) {
      filteredHomes = filteredHomes.filter(h => 
        h.address?.state?.toLowerCase().includes(state.toLowerCase())
      );
    }

    // Format data
    const formattedData = filteredHomes.map(h => ({
      id: h.id,
      name: h.name,
      phone: h.phone,
      email: h.email,
      status: h.status,
      licenseNumber: h.licenseNumber,
      capacity: h.capacity,
      currentOccupancy: h.currentOccupancy,
      'address.street': h.address?.street || '',
      'address.city': h.address?.city || '',
      'address.state': h.address?.state || '',
      'address.zipCode': h.address?.zipCode || '',
      createdAt: formatExportDateTime(h.createdAt),
    }));

    // Create audit log
    await createAuditLogFromRequest(
      req,
      user.id,
      AuditAction.EXPORT,
      'HOME',
      null,
      `Exported ${formattedData.length} homes`
    );

    // Return response based on format
    const filename = generateExportFilename('homes', format as 'csv' | 'json');
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = toCSV(formattedData, homeExportColumns);
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
