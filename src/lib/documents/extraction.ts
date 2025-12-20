import { prisma } from '@/lib/prisma';
import { extractTextFromImage, isImage } from './ocr';
import { extractTextFromPDF, isPDF, downloadFile } from './pdf-extractor';

export interface ExtractionResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

/**
 * Extract text from a document (PDF or image)
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
