/**
 * AI-powered field extraction utilities
 * Feature #6: Smart Document Processing
 */

import OpenAI from 'openai';
import { AIExtractionResult, ExtractedData, DocumentType } from '@/types/documents';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract structured fields from document text using OpenAI
 */
export async function extractFieldsWithAI(
  extractedText: string,
  documentType: DocumentType
): Promise<AIExtractionResult> {
  try {
    const prompt = buildExtractionPrompt(extractedText, documentType);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at extracting structured data from documents. Extract the requested fields and provide confidence scores.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
      extractedData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Field extraction failed',
    };
  }
}

/**
 * Build extraction prompt based on document type
 */
function buildExtractionPrompt(text: string, documentType: DocumentType): string {
  const basePrompt = `Extract structured data from the following document text. Return a JSON object where each field has a "value" and "confidence" (0-1 score).\n\nDocument text:\n${text}\n\n`;

  const fieldsByType: Record<DocumentType, string[]> = {
    MEDICAL_RECORD: [
      'patientName',
      'dateOfBirth',
      'medicalRecordNumber',
      'diagnosis',
      'medications',
      'allergies',
      'physicianName',
    ],
    INSURANCE_CARD: [
      'memberName',
      'memberId',
      'groupNumber',
      'planName',
      'effectiveDate',
      'expirationDate',
      'copay',
    ],
    ID_DOCUMENT: ['fullName', 'dateOfBirth', 'idNumber', 'expirationDate', 'address'],
    CONTRACT: ['partyNames', 'effectiveDate', 'expirationDate', 'terms', 'signatureDate'],
    FINANCIAL: ['amount', 'date', 'payee', 'payer', 'description', 'accountNumber'],
    CARE_PLAN: [
      'residentName',
      'careLevel',
      'services',
      'medications',
      'dietaryRestrictions',
      'effectiveDate',
    ],
    EMERGENCY_CONTACT: ['name', 'relationship', 'phone', 'email', 'address'],
    OTHER: ['generalInfo'],
  };

  const fields = fieldsByType[documentType] || fieldsByType.OTHER;
  const fieldsPrompt = `Extract the following fields: ${fields.join(', ')}`;

  return basePrompt + fieldsPrompt;
}
