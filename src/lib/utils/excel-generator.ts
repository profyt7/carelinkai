'use client';

import { ReportData } from '../services/reports';

/**
 * Generate Excel file from report data
 * Note: This is a simplified implementation that generates CSV-like content
 * In production, use a library like exceljs or xlsx for proper Excel format
 */
export async function generateExcel(reportData: ReportData): Promise<Blob> {
  // Create workbook content (simplified CSV format for now)
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
    table?.rows?.forEach?.((row) => {
      content += row?.map?.(cell => {
        // Escape commas and quotes in cells
        const escaped = String(cell ?? '').replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      })?.join?.(',') ?? '';
      content += '\n';
    });
    
    content += '\n';
  });

  // Create blob with Excel-compatible CSV format
  // Add BOM for UTF-8 to ensure Excel opens it correctly
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], {
    type: 'text/csv;charset=utf-8;',
  });

  return blob;
}

/**
 * Download Excel file
 */
export function downloadExcel(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
