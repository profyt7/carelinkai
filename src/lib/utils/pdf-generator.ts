'use client';

import { ReportData } from '../services/reports';

/**
 * Generate PDF from report data
 * Note: This is a placeholder implementation.
 * In production, use a library like jsPDF, pdfmake, or react-pdf
 */
export async function generatePDF(reportData: ReportData): Promise<Blob> {
  // For now, we'll create a simple HTML-based PDF
  // In production, integrate with a proper PDF library
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${reportData?.title ?? 'Report'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { color: #1e40af; font-size: 28px; margin-bottom: 10px; }
          .metadata { color: #666; font-size: 12px; }
          .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .summary h2 { color: #1e40af; font-size: 20px; margin-bottom: 15px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .summary-item { padding: 10px; }
          .summary-item label { font-size: 12px; color: #666; display: block; margin-bottom: 5px; }
          .summary-item value { font-size: 20px; font-weight: bold; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #3b82f6; color: white; padding: 12px; text-align: left; font-size: 14px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tbody tr:nth-child(even) { background: #f9fafb; }
          .table-section { margin: 30px 0; }
          .table-section h3 { color: #1e40af; font-size: 18px; margin-bottom: 15px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 11px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportData?.title ?? 'Report'}</h1>
          <div class="metadata">
            <p><strong>Generated:</strong> ${new Date(reportData?.metadata?.generatedAt ?? new Date()).toLocaleString()}</p>
            <p><strong>Date Range:</strong> ${new Date(reportData?.dateRange?.start ?? new Date()).toLocaleDateString()} - ${new Date(reportData?.dateRange?.end ?? new Date()).toLocaleDateString()}</p>
          </div>
        </div>

        ${reportData?.summary ? `
        <div class="summary">
          <h2>Executive Summary</h2>
          <div class="summary-grid">
            ${Object.entries(reportData?.summary ?? {})
              ?.map(
                ([key, value]) => `
              <div class="summary-item">
                <label>${key?.replace(/([A-Z])/g, ' $1')?.trim()}</label>
                <value>${typeof value === 'object' ? JSON.stringify(value) : value}</value>
              </div>
            `
              )
              ?.join('') ?? ''}
          </div>
        </div>
        ` : ''}

        ${reportData?.tables
          ?.map(
            (table) => `
          <div class="table-section">
            <h3>${table?.title ?? ''}</h3>
            <table>
              <thead>
                <tr>
                  ${table?.headers?.map?.((h) => `<th>${h}</th>`)?.join('') ?? ''}
                </tr>
              </thead>
              <tbody>
                ${table?.rows
                  ?.map?.(
                    (row) => `
                  <tr>
                    ${row?.map?.((cell) => `<td>${cell}</td>`)?.join('') ?? ''}
                  </tr>
                `
                  )
                  ?.join('') ?? ''}
              </tbody>
            </table>
          </div>
        `
          )
          ?.join('') ?? ''}

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
          <p>This report contains confidential information.</p>
        </div>
      </body>
    </html>
  `;

  // Convert HTML to Blob
  const blob = new Blob([htmlContent], { type: 'text/html' });
  return blob;
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
