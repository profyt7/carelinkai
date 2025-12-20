import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
}

/**
 * Extract text from an image using Tesseract OCR
 */
export async function extractTextFromImage(
  imageUrl: string,
  language: string = 'eng'
): Promise<OCRResult> {
  try {
    console.log('Starting OCR for image:', imageUrl);

    const result = await Tesseract.recognize(imageUrl, language, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    console.log('OCR completed:', {
      textLength: text.length,
      confidence: confidence.toFixed(2),
    });

    return {
      text,
      confidence,
      language,
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Check if a file is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get supported OCR languages
 */
export function getSupportedLanguages(): string[] {
  return ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'chi_sim', 'jpn', 'kor'];
}
