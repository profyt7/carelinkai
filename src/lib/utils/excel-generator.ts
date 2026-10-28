import type { ReportData } from '../services/reports';

/**
 * Generate Excel file from report data
 * Note: This generates CSV content for Excel compatibility
 * For more advanced features, consider using 'exceljs' library
 */
export async function generateExcel(reportData: ReportData): Promise<Buffer> {
  // Create workbook content (CSV format compatible with Excel)
  let content = '';

  // Add title and metadata
  content += `${reportData?.title ?? 'Report'}\n`;
  content += `Generated: ${new Date(reportData?.metadata?.generatedAt ?? new Date()).toLocaleString()}\n`;
  content += `Date Range: ${new Date(reportData?.dateRange?.start ?? new Date()).toLocaleDateString()} - ${new Date(reportData?.dateRange?.end ?? new Date()).toLocaleDateString()}\n`;
  content += '\n';

  // Add summary section
  if (reportData?.summary) {
    content += 'EXECUTIVE SUMMARY\n';
    Object.entries(reportData?.summary ?? {})?.forEach?.(([key, value]) => {
      const label = key?.replace(/([A-Z])/g, ' $1')?.trim();
      content += `${label},${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
    });
    content += '\n';
  }

  // Add tables
  reportData?.tables?.forEach?.((table) => {
    content += `${table?.title ?? ''}\n`;
    
    // Add headers
    content += table?.headers?.join?.(',') ?? '';
    content += '\n';
    
    // Add rows
    table?.rows?.forEach?.((row: any) => {
      content += row?.map?.((cell: any) => {
        // Escape commas and quotes in cells
        const escaped = String(cell ?? '').replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      })?.join?.(',') ?? '';
      content += '\n';
    });
    
    content += '\n';
  });

  // Add BOM for UTF-8 to ensure Excel opens it correctly
  const BOM = '\uFEFF';
  const buffer = Buffer.from(BOM + content, 'utf-8');

  return buffer;
}
