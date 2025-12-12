import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyPermission } from '@/lib/auth-utils';
import { generateReport } from '@/lib/services/reports';
import { generatePDF } from '@/lib/utils/pdf-generator';
import { generateExcel } from '@/lib/utils/excel-generator';
import { generateCSV } from '@/lib/utils/csv-generator';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { subMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reports/generate
 * Generate a report based on configuration and return the file
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

    // Add title to report data
    const fullReportData = {
      ...reportData,
      title,
    };

    // Generate file based on format
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    switch (format.toUpperCase()) {
      case 'PDF':
        fileBuffer = await generatePDF(fullReportData);
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;
      
      case 'EXCEL':
        fileBuffer = await generateExcel(fullReportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      
      case 'CSV':
        fileBuffer = await generateCSV(fullReportData);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      
      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}` },
          { status: 400 }
        );
    }

    // Generate safe filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_${timestamp}.${fileExtension}`;

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
      details: `Generated ${type} report: ${title} (${format})`,
    });

    // Return file as download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
