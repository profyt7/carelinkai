// PDF extraction utilities with proper error handling
// Uses dynamic imports to avoid canvas issues during build

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  info: any;
}

/**
 * Extract text from a PDF file
 * Uses dynamic import to avoid canvas/DOMMatrix issues during build
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<PDFExtractionResult> {
  try {
    console.log('Starting PDF text extraction...');

    // Dynamic import to avoid issues during build
    const pdf = await import('pdf-parse');
    const pdfParse = pdf.default || pdf;
    
    const data = await pdfParse(pdfBuffer);

    const text = data.text.trim();
    const numPages = data.numpages;
    const info = data.info;

    console.log('PDF extraction completed:', {
      textLength: text.length,
      numPages,
    });

    return {
      text,
      numPages,
      info,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Graceful fallback if pdf-parse fails
    if (error instanceof Error && error.message.includes('canvas')) {
      throw new Error('PDF extraction unavailable: Canvas dependency error');
    }
    
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Check if a file is a PDF
 */
export function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Download file from URL and return as buffer
 */
export async function downloadFile(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('File download error:', error);
    throw new Error('Failed to download file');
  }
}
