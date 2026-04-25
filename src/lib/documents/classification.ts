/**
 * Document classification service with AI-powered analysis
 * Phase 3: Smart Document Processing
 */

import { getAnthropicClient, requireAnthropicKey } from '@/lib/ai/claude';
import {
  DocumentType,
  ClassificationResult,
  ReviewStatus,
} from '@/lib/types/documents';

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 85, // Auto-classify
  MEDIUM: 70, // Suggest with review
  LOW: 0, // Manual classification required
} as const;

/**
 * Classify document type using AI with confidence scoring and reasoning
 */
export async function classifyDocument(
  extractedText: string,
  fileName: string
): Promise<ClassificationResult> {
  try {
    if (!extractedText || extractedText.trim().length < 10) {
      return {
        success: false,
        error: 'Insufficient text content for classification',
      };
    }

    requireAnthropicKey();

    const prompt = `You are an expert document classifier for a senior care management system. Analyze the following document and classify it into one of these types:

1. MEDICAL_RECORD - Medical records, doctor notes, test results, diagnoses, treatment plans
2. INSURANCE - Insurance cards, policy documents, coverage information, claims
3. IDENTIFICATION - ID cards, passports, driver's licenses, social security cards
4. FINANCIAL - Bank statements, financial agreements, payment records, invoices
5. LEGAL - Power of attorney, living wills, legal contracts, advance directives
6. ASSESSMENT_FORM - Care assessments, evaluation forms, intake forms, assessment questionnaires
7. EMERGENCY_CONTACT - Emergency contact information, contact lists
8. GENERAL - Other documents that don't fit the above categories

File name: ${fileName}

Document text (first 1000 characters):
${extractedText.substring(0, 1000)}

Provide a JSON response with exactly these fields:
- "type": The document type (one of the 8 types above)
- "confidence": Confidence score from 0 to 100 (integer)
- "reasoning": Brief explanation (2-3 sentences) of why you classified it this way

Only use high confidence (>85) when you are very sure. Return raw JSON only with no markdown or code blocks.`;

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: 'You are an expert at classifying documents for healthcare and senior care facilities. Always respond with raw JSON only — no markdown, no code blocks.',
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    const rawText = block.type === 'text' ? block.text.trim() : '';

    // Strip any accidental markdown fences
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(jsonText);

    if (!result.type || result.confidence === undefined || !result.reasoning) {
      return {
        success: false,
        error: 'Invalid response from classification service',
      };
    }

    const confidence = Math.max(0, Math.min(100, Number(result.confidence)));

    return {
      success: true,
      type: result.type as DocumentType,
      confidence,
      reasoning: result.reasoning,
      category: getCategoryForType(result.type),
    };
  } catch (error) {
    console.error('Classification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Classification failed',
    };
  }
}

/**
 * Determine review status based on confidence threshold
 */
export function determineReviewStatus(confidence: number): ReviewStatus {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'NOT_REQUIRED';
  }
  return 'PENDING_REVIEW';
}

/**
 * Check if document should be auto-classified based on confidence
 */
export function shouldAutoClassify(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLDS.HIGH;
}

/**
 * Get category label for document type
 */
function getCategoryForType(type: DocumentType): string {
  const categories: Record<DocumentType, string> = {
    MEDICAL_RECORD: 'Medical',
    INSURANCE: 'Insurance',
    IDENTIFICATION: 'Identification',
    FINANCIAL: 'Financial',
    LEGAL: 'Legal',
    ASSESSMENT_FORM: 'Assessment',
    EMERGENCY_CONTACT: 'Contact',
    GENERAL: 'General',
  };

  return categories[type] || 'General';
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): {
  level: 'high' | 'medium' | 'low';
  label: string;
  color: string;
} {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return { level: 'high', label: 'High Confidence', color: 'text-success-600' };
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return { level: 'medium', label: 'Medium Confidence', color: 'text-warning-600' };
  } else {
    return { level: 'low', label: 'Low Confidence', color: 'text-error-600' };
  }
}

/**
 * Format classification result for display
 */
export function formatClassificationResult(result: ClassificationResult): string {
  if (!result.success) {
    return `Classification failed: ${result.error}`;
  }

  const confidenceLevel = getConfidenceLevel(result.confidence || 0);
  return `Classified as ${result.type} with ${confidenceLevel.label} (${result.confidence}%)`;
}
