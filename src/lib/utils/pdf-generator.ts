import PDFDocument from 'pdfkit';
import type { ReportData } from '../services/reports';

/**
 * Generate PDF from report data using PDFKit
 * This runs on the server-side (Node.js)
 */
export async function generatePDF(reportData: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: reportData?.title ?? 'Report',
          Author: 'CareLinkAI',
          Subject: 'Care Home Report',
          CreationDate: new Date(),
        }
      });

      // Collect PDF chunks
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with title
      const leftAlign = { align: 'left' as const };
      doc
        .fontSize(24)
        .fillColor('#1e40af')
        .text(reportData?.title ?? 'Report', leftAlign)
        .moveDown(0.5);

      // Add a line separator
      doc
        .strokeColor('#3b82f6')
        .lineWidth(3)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Metadata
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text(`Generated: ${new Date(reportData?.metadata?.generatedAt ?? new Date()).toLocaleString()}`)
        .text(`Date Range: ${new Date(reportData?.dateRange?.start ?? new Date()).toLocaleDateString()} - ${new Date(reportData?.dateRange?.end ?? new Date()).toLocaleDateString()}`)
        .moveDown(2);

      // Executive Summary
      if (reportData?.summary && Object.keys(reportData.summary).length > 0) {
        doc
          .fontSize(16)
          .fillColor('#1e40af')
          .text('Executive Summary', { underline: true })
          .moveDown(0.5);

        // Summary items
        const summaryEntries = Object.entries(reportData.summary);
        summaryEntries.forEach(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          
          doc
            .fontSize(10)
            .fillColor('#666666')
            .text(label, { continued: false })
            .fontSize(14)
            .fillColor('#1e40af')
            .text(displayValue, { indent: 20 })
            .moveDown(0.3);
        });

        doc.moveDown(1.5);
      }

      // Tables
      if (reportData?.tables && reportData.tables.length > 0) {
        reportData.tables.forEach((table, tableIndex) => {
          // Check if we need a new page
          if (doc.y > 650) {
            doc.addPage();
          }

          // Table title
          doc
            .fontSize(14)
            .fillColor('#1e40af')
            .text(table?.title ?? `Table ${tableIndex + 1}`, { underline: true })
            .moveDown(0.5);

          // Draw table headers
          const tableTop = doc.y;
          const columnWidth = 495 / (table?.headers?.length || 1);
          let currentX = 50;

          // Header row background
          doc
            .rect(50, tableTop, 495, 25)
            .fillAndStroke('#3b82f6', '#3b82f6');

          // Header text
          doc.fillColor('#ffffff').fontSize(10);
          table?.headers?.forEach((header: any, i: number) => {
            doc.text(
              String(header),
              currentX + 5,
              tableTop + 8,
              { width: columnWidth - 10, align: 'left' }
            );
            currentX += columnWidth;
          });

          // Table rows
          let rowY = tableTop + 25;
          table?.rows?.forEach((row: any, rowIndex: number) => {
            // Check if we need a new page
            if (rowY > 700) {
              doc.addPage();
              rowY = 50;
            }

            // Alternating row colors
            const fillColor = rowIndex % 2 === 0 ? '#f9fafb' : '#ffffff';
            doc
              .rect(50, rowY, 495, 20)
              .fillAndStroke(fillColor, '#e5e7eb');

            // Row text
            currentX = 50;
            doc.fillColor('#333333').fontSize(9);
            row?.forEach((cell: any) => {
              doc.text(
                String(cell),
                currentX + 5,
                rowY + 5,
                { width: columnWidth - 10, align: 'left' }
              );
              currentX += columnWidth;
            });

            rowY += 20;
          });

          doc.y = rowY + 20;
          doc.moveDown(1);
        });
      }

      // Footer
      const centerAlign = { align: 'center' as const };
      doc
        .moveDown(2)
        .fontSize(9)
        .fillColor('#666666')
        .text(
          `© ${new Date().getFullYear()} CareLinkAI. All rights reserved.`,
          centerAlign
        )
        .text('This report contains confidential information.', centerAlign);

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
