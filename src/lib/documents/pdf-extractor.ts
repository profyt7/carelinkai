import pdf from 'pdf-parse';

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  info: any;
}

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<PDFExtractionResult> {
  try {
    console.log('Starting PDF text extraction...');

    const data = await pdf(pdfBuffer);

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
