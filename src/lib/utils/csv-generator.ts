'use client';

import { ReportData } from '../services/reports';

/**
 * Generate CSV file from report data
 */
export async function generateCSV(reportData: ReportData): Promise<Blob> {
  let content = '';

  // Add title and metadata
  content += `"${reportData?.title ?? 'Report'}"\n`;
  content += `"Generated: ${new Date(reportData?.metadata?.generatedAt ?? new Date()).toLocaleString()}"\n`;
  content += `"Date Range: ${new Date(reportData?.dateRange?.start ?? new Date()).toLocaleDateString()} - ${new Date(reportData?.dateRange?.end ?? new Date()).toLocaleDateString()}"\n`;
  content += '\n';

  // Add summary section
  if (reportData?.summary) {
    content += '"EXECUTIVE SUMMARY"\n';
    content += '"Metric","Value"\n';
    Object.entries(reportData?.summary ?? {})?.forEach?.(([key, value]) => {
      const label = key?.replace(/([A-Z])/g, ' $1')?.trim();
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      content += `"${label}","${valueStr?.replace?.(/"/g, '""') ?? ''}"\n`;
    });
    content += '\n';
  }

  // Add tables
  reportData?.tables?.forEach?.((table) => {
    content += `"${table?.title ?? ''}"\n`;
    
    // Add headers
    content += table?.headers?.map?.(h => `"${String(h ?? '')?.replace?.(/"/g, '""') ?? ''}"`).join(',') ?? '';
    content += '\n';
    
    // Add rows
    table?.rows?.forEach?.((row) => {
      content += row?.map?.(cell => {
        const str = String(cell ?? '');
        return `"${str?.replace?.(/"/g, '""') ?? ''}"`;
      })?.join?.(',') ?? '';
      content += '\n';
    });
    
    content += '\n';
  });

  // Create blob with UTF-8 BOM for proper Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], {
    type: 'text/csv;charset=utf-8;',
  });

  return blob;
}

/**
 * Download CSV file
 */
export function downloadCSV(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert data array to CSV string
 */
export function arrayToCSV(data: any[], headers?: string[]): string {
  let csv = '';

  // Add headers if provided
  if (headers?.length) {
    csv += headers?.map?.(h => `"${String(h ?? '')?.replace?.(/"/g, '""') ?? ''}"`).join(',') ?? '';
    csv += '\n';
  }

  // Add data rows
  data?.forEach?.((row) => {
    if (Array.isArray(row)) {
      csv += row?.map?.(cell => {
        const str = String(cell ?? '');
        return `"${str?.replace?.(/"/g, '""') ?? ''}"`;
      })?.join?.(',') ?? '';
    } else {
      // Handle object rows
      csv += Object.values(row ?? {})?.map?.(cell => {
        const str = String(cell ?? '');
        return `"${str?.replace?.(/"/g, '""') ?? ''}"`;
      })?.join?.(',') ?? '';
    }
    csv += '\n';
  });

  return csv;
}
