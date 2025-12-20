/**
 * Document classification utilities
 * Feature #6: Smart Document Processing
 */

import OpenAI from 'openai';
import { ClassificationResult, DocumentType } from '@/types/documents';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Classify document type using AI
 */
export async function classifyDocument(
  extractedText: string,
  fileName: string
): Promise<ClassificationResult> {
  try {
    const prompt = `Classify the following document into one of these types:
- MEDICAL_RECORD
- INSURANCE_CARD
- ID_DOCUMENT
- CONTRACT
- FINANCIAL
- CARE_PLAN
- EMERGENCY_CONTACT
- OTHER

File name: ${fileName}

Document text (first 500 characters):
${extractedText.substring(0, 500)}

Return a JSON object with "type" (the classification) and "confidence" (0-1 score).`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at classifying documents.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
      type: result.type as DocumentType,
      confidence: result.confidence,
      category: getCategoryForType(result.type),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Classification failed',
    };
  }
}

/**
 * Get category for document type
 */
function getCategoryForType(type: DocumentType): string {
  const categories: Record<DocumentType, string> = {
    MEDICAL_RECORD: 'Medical',
    INSURANCE_CARD: 'Insurance',
    ID_DOCUMENT: 'Identification',
    CONTRACT: 'Legal',
    FINANCIAL: 'Financial',
    CARE_PLAN: 'Care',
    EMERGENCY_CONTACT: 'Contact',
    OTHER: 'General',
  };

  return categories[type] || 'General';
}
