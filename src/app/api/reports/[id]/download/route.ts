export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyPermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { generateReport } from '@/lib/services/reports';
import { generatePDF } from '@/lib/utils/pdf-generator';
import { generateExcel } from '@/lib/utils/excel-generator';
import { generateCSV } from '@/lib/utils/csv-generator';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/reports/[id]/download
 * Re-generates a previously created report from its stored config and streams it as a file.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    await requireAnyPermission(['reports.view', 'reports.generate', 'analytics.view']);

    const report = await prisma.report.findUnique({ where: { id: params.id } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const config = report.config as any;

    const reportData = await generateReport(report.type, {
      startDate: config.startDate ? new Date(config.startDate) : new Date(Date.now() - 30 * 86400_000),
      endDate: config.endDate ? new Date(config.endDate) : new Date(),
      homeIds: config.homeIds ?? [],
      includeCharts: config.includeCharts ?? true,
      includeSummary: config.includeSummary ?? true,
      includeDetails: config.includeDetails ?? true,
    });

    const fullData = { ...reportData, title: report.title };

    let fileBuffer: Buffer;
    let contentType: string;
    let ext: string;

    switch ((report.format as string).toUpperCase()) {
      case 'EXCEL':
        fileBuffer = await generateExcel(fullData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        ext = 'xlsx';
        break;
      case 'CSV':
        fileBuffer = await generateCSV(fullData);
        contentType = 'text/csv';
        ext = 'csv';
        break;
      default:
        fileBuffer = await generatePDF(fullData);
        contentType = 'application/pdf';
        ext = 'pdf';
    }

    const inline = request.nextUrl.searchParams.get('inline') === '1';
    const safeTitle = report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}.${ext}`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('[Report Download]', err);
    return NextResponse.json({ error: err.message || 'Failed to download report' }, { status: 500 });
  }
}
