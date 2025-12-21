// Document extraction utilities with dynamic imports
// Uses dynamic imports to avoid canvas/DOMMatrix issues during build

import { prisma } from '@/lib/prisma';

export interface ExtractionResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

/**
 * Extract text from a document (PDF or image)
 * Uses dynamic imports to avoid build-time canvas issues
 */
export async function extractDocumentText(
  documentId: string
): Promise<ExtractionResult> {
  try {
    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }

    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'PROCESSING',
      },
    });

    let extractedText = '';
    let confidence = 100;

    // Dynamic import of extraction utilities
    const { extractTextFromImage, isImage } = await import('./ocr');
    const { extractTextFromPDF, isPDF, downloadFile } = await import('./pdf-extractor');

    // Extract based on file type
    if (isPDF(document.mimeType)) {
      console.log(`Extracting text from PDF: ${document.fileName}`);
      
      // Download PDF file
      const pdfBuffer = await downloadFile(document.fileUrl);
      
      // Extract text
      const result = await extractTextFromPDF(pdfBuffer);
      extractedText = result.text;
      
    } else if (isImage(document.mimeType)) {
      console.log(`Extracting text from image: ${document.fileName}`);
      
      // Run OCR
      const result = await extractTextFromImage(document.fileUrl);
      extractedText = result.text;
      confidence = result.confidence;
      
    } else {
      return {
        success: false,
        error: 'Unsupported file type for text extraction',
      };
    }

    // Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText,
        extractionStatus: 'COMPLETED',
        extractionError: null,
      },
    });

    console.log(`Text extraction completed for ${document.fileName}`);

    // Automatically trigger classification and validation
    // Run in background - don't wait for it
    setTimeout(async () => {
      try {
        const { processDocument } = await import('./processing');
        console.log(`Auto-processing document ${documentId}...`);
        await processDocument(documentId);
        console.log(`Auto-processing completed for ${documentId}`);
      } catch (error) {
        console.error(`Auto-processing failed for ${documentId}:`, error);
      }
    }, 100); // Small delay to allow extraction to fully complete

    return {
      success: true,
      text: extractedText,
      confidence,
    };
  } catch (error) {
    console.error('Extraction error:', error);

    // Update document with error
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'FAILED',
        extractionError: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract text from multiple documents
 */
export async function extractMultipleDocuments(
  documentIds: string[]
): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>();

  for (const documentId of documentIds) {
    const result = await extractDocumentText(documentId);
    results.set(documentId, result);
  }

  return results;
}