/**
 * Document linking service
 * Phase 3: Smart Document Processing - Part 2
 * 
 * Helper functions for linking documents to Residents and Inquiries
 */

import { prisma } from '@/lib/prisma';
import { DocumentType } from '@prisma/client';

/**
 * Link a document to a Resident
 */
export async function linkDocumentToResident(
  documentId: string,
  residentId: string
): Promise<boolean> {
  try {
    // Verify resident exists
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
    });

    if (!resident) {
      throw new Error('Resident not found');
    }

    // Link document to resident
    await prisma.document.update({
      where: { id: documentId },
      data: {
        residentId,
        inquiryId: null, // Remove inquiry link if present
      },
    });

    return true;
  } catch (error) {
    console.error('Error linking document to resident:', error);
    throw error;
  }
}

/**
 * Link a document to an Inquiry
 */
export async function linkDocumentToInquiry(
  documentId: string,
  inquiryId: string
): Promise<boolean> {
  try {
    // Verify inquiry exists
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      throw new Error('Inquiry not found');
    }

    // Link document to inquiry
    await prisma.document.update({
      where: { id: documentId },
      data: {
        inquiryId,
        residentId: null, // Remove resident link if present
      },
    });

    return true;
  } catch (error) {
    console.error('Error linking document to inquiry:', error);
    throw error;
  }
}

/**
 * Unlink a document from any entity
 */
export async function unlinkDocument(documentId: string): Promise<boolean> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        residentId: null,
        inquiryId: null,
      },
    });

    return true;
  } catch (error) {
    console.error('Error unlinking document:', error);
    throw error;
  }
}

/**
 * Get documents by Resident ID
 */
export async function getDocumentsByResident(
  residentId: string,
  options?: {
    type?: DocumentType;
    includeRelations?: boolean;
  }
) {
  const where: any = { residentId };

  if (options?.type) {
    where.type = options.type;
  }

  const include = options?.includeRelations ? {
    uploadedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    reviewedBy: {
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
  } : undefined;

  return prisma.document.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get documents by Inquiry ID
 */
export async function getDocumentsByInquiry(
  inquiryId: string,
  options?: {
    type?: DocumentType;
    includeRelations?: boolean;
  }
) {
  const where: any = { inquiryId };

  if (options?.type) {
    where.type = options.type;
  }

  const include = options?.includeRelations ? {
    uploadedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    reviewedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    inquiry: {
      select: {
        id: true,
        contactName: true,
      },
    },
  } : undefined;

  return prisma.document.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get documents by type
 */
export async function getDocumentsByType(
  type: DocumentType,
  options?: {
    residentId?: string;
    inquiryId?: string;
    includeRelations?: boolean;
    limit?: number;
  }
) {
  const where: any = { type };

  if (options?.residentId) {
    where.residentId = options.residentId;
  }

  if (options?.inquiryId) {
    where.inquiryId = options.inquiryId;
  }

  const include = options?.includeRelations ? {
    uploadedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    reviewedBy: {
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
    inquiry: {
      select: {
        id: true,
        contactName: true,
      },
    },
  } : undefined;

  return prisma.document.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
    take: options?.limit,
  });
}

/**
 * Search documents with advanced filtering
 */
export async function searchDocuments(options: {
  query?: string;
  type?: DocumentType;
  residentId?: string;
  inquiryId?: string;
  validationStatus?: string;
  reviewStatus?: string;
  autoClassified?: boolean;
  uploadedById?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  // Text search
  if (options.query) {
    where.OR = [
      { fileName: { contains: options.query, mode: 'insensitive' } },
      { notes: { contains: options.query, mode: 'insensitive' } },
      { extractedText: { contains: options.query, mode: 'insensitive' } },
    ];
  }

  // Type filter
  if (options.type) {
    where.type = options.type;
  }

  // Entity filters
  if (options.residentId) {
    where.residentId = options.residentId;
  }

  if (options.inquiryId) {
    where.inquiryId = options.inquiryId;
  }

  // Status filters
  if (options.validationStatus) {
    where.validationStatus = options.validationStatus;
  }

  if (options.reviewStatus) {
    where.reviewStatus = options.reviewStatus;
  }

  if (options.autoClassified !== undefined) {
    where.autoClassified = options.autoClassified;
  }

  if (options.uploadedById) {
    where.uploadedById = options.uploadedById;
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedBy: {
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
        inquiry: {
          select: {
            id: true,
            contactName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents,
    total,
    limit: options.limit || 20,
    offset: options.offset || 0,
  };
}

/**
 * Get document statistics for a Resident
 */
export async function getResidentDocumentStats(residentId: string) {
  const [
    total,
    byType,
    needsReview,
    autoClassified,
    valid,
  ] = await Promise.all([
    prisma.document.count({ where: { residentId } }),
    prisma.document.groupBy({
      by: ['type'],
      where: { residentId },
      _count: true,
    }),
    prisma.document.count({
      where: {
        residentId,
        reviewStatus: 'PENDING_REVIEW',
      },
    }),
    prisma.document.count({
      where: {
        residentId,
        autoClassified: true,
      },
    }),
    prisma.document.count({
      where: {
        residentId,
        validationStatus: 'VALID',
      },
    }),
  ]);

  return {
    total,
    byType: byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>),
    needsReview,
    autoClassified,
    valid,
    autoClassificationRate: total > 0 ? (autoClassified / total) * 100 : 0,
    validationRate: total > 0 ? (valid / total) * 100 : 0,
  };
}

/**
 * Get document statistics for an Inquiry
 */
export async function getInquiryDocumentStats(inquiryId: string) {
  const [
    total,
    byType,
    needsReview,
    autoClassified,
    valid,
  ] = await Promise.all([
    prisma.document.count({ where: { inquiryId } }),
    prisma.document.groupBy({
      by: ['type'],
      where: { inquiryId },
      _count: true,
    }),
    prisma.document.count({
      where: {
        inquiryId,
        reviewStatus: 'PENDING_REVIEW',
      },
    }),
    prisma.document.count({
      where: {
        inquiryId,
        autoClassified: true,
      },
    }),
    prisma.document.count({
      where: {
        inquiryId,
        validationStatus: 'VALID',
      },
    }),
  ]);

  return {
    total,
    byType: byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>),
    needsReview,
    autoClassified,
    valid,
    autoClassificationRate: total > 0 ? (autoClassified / total) * 100 : 0,
    validationRate: total > 0 ? (valid / total) * 100 : 0,
  };
}

/**
 * Bulk link documents to a Resident
 */
export async function bulkLinkDocumentsToResident(
  documentIds: string[],
  residentId: string
): Promise<number> {
  try {
    // Verify resident exists
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
    });

    if (!resident) {
      throw new Error('Resident not found');
    }

    // Bulk update documents
    const result = await prisma.document.updateMany({
      where: {
        id: {
          in: documentIds,
        },
      },
      data: {
        residentId,
        inquiryId: null,
      },
    });

    return result.count;
  } catch (error) {
    console.error('Error bulk linking documents to resident:', error);
    throw error;
  }
}

/**
 * Bulk link documents to an Inquiry
 */
export async function bulkLinkDocumentsToInquiry(
  documentIds: string[],
  inquiryId: string
): Promise<number> {
  try {
    // Verify inquiry exists
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      throw new Error('Inquiry not found');
    }

    // Bulk update documents
    const result = await prisma.document.updateMany({
      where: {
        id: {
          in: documentIds,
        },
      },
      data: {
        inquiryId,
        residentId: null,
      },
    });

    return result.count;
  } catch (error) {
    console.error('Error bulk linking documents to inquiry:', error);
    throw error;
  }
}
