/**
 * Compliance checking utilities
 * Feature #6: Smart Document Processing
 */

import { prisma } from '@/lib/prisma';
import { ComplianceCheckResult, DocumentType } from '@/lib/types/documents';
import { ComplianceStatus } from '@prisma/client';

/**
 * Required documents for resident compliance
 */
const REQUIRED_DOCUMENTS: DocumentType[] = [
  'MEDICAL_RECORD',
  'INSURANCE_CARD',
  'ID_DOCUMENT',
  'EMERGENCY_CONTACT',
];

/**
 * Check compliance status for a resident
 */
export async function checkResidentCompliance(
  residentId: string
): Promise<ComplianceCheckResult> {
  try {
    // Get all documents for resident
    const documents = await prisma.document.findMany({
      where: { residentId },
      select: {
        id: true,
        type: true,
        fileName: true,
        expirationDate: true,
        complianceStatus: true,
      },
    });

    // Check for missing required documents
    const existingTypes = new Set(documents.map((d) => d.type));
    const missing = REQUIRED_DOCUMENTS.filter((type) => !existingTypes.has(type)).map(
      (type) => ({
        type,
        description: getDocumentTypeDescription(type),
      })
    );

    // Check for expiring documents (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiring = documents
      .filter(
        (d) =>
          d.expirationDate &&
          d.expirationDate > now &&
          d.expirationDate <= thirtyDaysFromNow
      )
      .map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        expirationDate: d.expirationDate!,
        daysUntilExpiration: Math.ceil(
          (d.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    const completed = documents.filter((d) => d.complianceStatus === 'COMPLIANT').length;

    return {
      status:
        missing.length === 0 && expiring.length === 0
          ? 'COMPLIANT'
          : missing.length > 0
          ? 'NON_COMPLIANT'
          : 'PARTIAL',
      required: REQUIRED_DOCUMENTS.length,
      completed,
      missing,
      expiring,
    };
  } catch (error) {
    throw new Error(
      `Failed to check compliance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get description for document type
 */
function getDocumentTypeDescription(type: DocumentType): string {
  const descriptions: Record<DocumentType, string> = {
    MEDICAL_RECORD: 'Medical records and health history',
    INSURANCE_CARD: 'Insurance card with coverage information',
    ID_DOCUMENT: 'Government-issued identification',
    CONTRACT: 'Admission or service contract',
    FINANCIAL: 'Financial information and payment details',
    CARE_PLAN: 'Personalized care plan',
    EMERGENCY_CONTACT: 'Emergency contact information',
    OTHER: 'Other supporting documents',
  };

  return descriptions[type] || 'Document';
}

/**
 * Update compliance status for a document
 */
export async function updateDocumentComplianceStatus(
  documentId: string
): Promise<ComplianceStatus> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { expirationDate: true },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  let status: ComplianceStatus;

  if (!document.expirationDate) {
    status = 'COMPLIANT';
  } else if (document.expirationDate < now) {
    status = 'EXPIRED';
  } else if (document.expirationDate <= thirtyDaysFromNow) {
    status = 'EXPIRING_SOON';
  } else {
    status = 'COMPLIANT';
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { complianceStatus: status },
  });

  return status;
}
