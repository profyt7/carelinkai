/**
 * Document processing service
 * Phase 3: Smart Document Processing
 * 
 * Orchestrates document classification and validation
 */

import { prisma } from '@/lib/prisma';
import { classifyDocument, determineReviewStatus, shouldAutoClassify } from './classification';
import { validateDocument, getValidationStatus } from './validation';
import { DocumentType } from '@/types/documents';

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  classified: boolean;
  validated: boolean;
  autoClassified: boolean;
  needsReview: boolean;
  error?: string;
}

/**
 * Process a document: classify and validate
 * This is the main entry point for document processing
 */
export async function processDocument(documentId: string): Promise<ProcessingResult> {
  try {
    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return {
        success: false,
        documentId,
        classified: false,
        validated: false,
        autoClassified: false,
        needsReview: false,
        error: 'Document not found',
      };
    }

    // Check if document has extracted text
    if (!document.extractedText || document.extractedText.trim().length < 10) {
      return {
        success: false,
        documentId,
        classified: false,
        validated: false,
        autoClassified: false,
        needsReview: true,
        error: 'Document does not have sufficient extracted text',
      };
    }

    // Step 1: Classify the document
    console.log(`Classifying document ${documentId}...`);
    const classificationResult = await classifyDocument(
      document.extractedText,
      document.fileName
    );

    if (!classificationResult.success) {
      console.error('Classification failed:', classificationResult.error);
      
      // Update document with error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          reviewStatus: 'PENDING_REVIEW',
          classificationReasoning: `Classification failed: ${classificationResult.error}`,
        },
      });

      return {
        success: false,
        documentId,
        classified: false,
        validated: false,
        autoClassified: false,
        needsReview: true,
        error: classificationResult.error,
      };
    }

    const confidence = classificationResult.confidence || 0;
    const documentType = classificationResult.type!;
    const reasoning = classificationResult.reasoning || 'No reasoning provided';
    const reviewStatus = determineReviewStatus(confidence);
    const autoClassify = shouldAutoClassify(confidence);

    console.log(`Document classified as ${documentType} with ${confidence}% confidence`);

    // Step 2: Validate the document
    console.log(`Validating document ${documentId}...`);
    const validationResult = await validateDocument(
      documentType,
      document.extractedText,
      document.extractedData
    );

    if (!validationResult.success) {
      console.error('Validation failed');
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          type: documentType,
          classificationConfidence: confidence,
          classificationReasoning: reasoning,
          autoClassified: autoClassify,
          reviewStatus,
          validationStatus: 'INVALID',
          validationErrors: { error: 'Validation process failed' },
        },
      });

      return {
        success: true,
        documentId,
        classified: true,
        validated: false,
        autoClassified: autoClassify,
        needsReview: true,
      };
    }

    const validationStatus = getValidationStatus(
      validationResult.errors,
      validationResult.warnings
    );

    const allValidationErrors = [
      ...validationResult.errors,
      ...validationResult.warnings,
    ];

    console.log(
      `Validation complete: ${validationStatus} (${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings)`
    );

    // Step 3: Update document with results
    await prisma.document.update({
      where: { id: documentId },
      data: {
        type: documentType,
        classificationConfidence: confidence,
        classificationReasoning: reasoning,
        autoClassified: autoClassify,
        reviewStatus,
        validationStatus,
        validationErrors: allValidationErrors.length > 0 ? allValidationErrors : null,
        category: classificationResult.category,
      },
    });

    console.log(`Document ${documentId} processing complete`);

    return {
      success: true,
      documentId,
      classified: true,
      validated: true,
      autoClassified: autoClassify,
      needsReview: reviewStatus === 'PENDING_REVIEW' || validationStatus !== 'VALID',
    };
  } catch (error) {
    console.error('Document processing error:', error);
    
    // Try to update document with error status
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          reviewStatus: 'PENDING_REVIEW',
          validationStatus: 'INVALID',
          classificationReasoning: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } catch (updateError) {
      console.error('Failed to update document with error:', updateError);
    }

    return {
      success: false,
      documentId,
      classified: false,
      validated: false,
      autoClassified: false,
      needsReview: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process multiple documents in batch
 */
export async function processDocuments(documentIds: string[]): Promise<Map<string, ProcessingResult>> {
  const results = new Map<string, ProcessingResult>();

  for (const documentId of documentIds) {
    const result = await processDocument(documentId);
    results.set(documentId, result);
  }

  return results;
}

/**
 * Get documents that need review
 */
export async function getDocumentsNeedingReview(userId?: string) {
  const where: any = {
    OR: [
      { reviewStatus: 'PENDING_REVIEW' },
      { validationStatus: 'NEEDS_REVIEW' },
      { validationStatus: 'INVALID' },
    ],
  };

  // Filter by user if provided
  if (userId) {
    where.uploadedById = userId;
  }

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Mark document as reviewed by a user
 */
export async function markDocumentAsReviewed(
  documentId: string,
  reviewedById: string,
  updates?: {
    type?: DocumentType;
    notes?: string;
  }
) {
  const data: any = {
    reviewStatus: 'REVIEWED',
    reviewedById,
    reviewedAt: new Date(),
  };

  if (updates?.type) {
    data.type = updates.type;
    // If type was manually changed, mark as not auto-classified
    data.autoClassified = false;
  }

  if (updates?.notes) {
    data.notes = updates.notes;
  }

  return prisma.document.update({
    where: { id: documentId },
    data,
    include: {
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get processing statistics
 */
export async function getProcessingStats(userId?: string) {
  const where: any = {};
  
  if (userId) {
    where.uploadedById = userId;
  }

  const [
    total,
    autoClassified,
    needingReview,
    reviewed,
    valid,
    invalid,
  ] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, autoClassified: true } }),
    prisma.document.count({ where: { ...where, reviewStatus: 'PENDING_REVIEW' } }),
    prisma.document.count({ where: { ...where, reviewStatus: 'REVIEWED' } }),
    prisma.document.count({ where: { ...where, validationStatus: 'VALID' } }),
    prisma.document.count({ where: { ...where, validationStatus: 'INVALID' } }),
  ]);

  return {
    total,
    autoClassified,
    needingReview,
    reviewed,
    valid,
    invalid,
    autoClassificationRate: total > 0 ? (autoClassified / total) * 100 : 0,
    validationRate: total > 0 ? (valid / total) * 100 : 0,
  };
}
