import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/operator/caregivers/[id]/documents - List all documents
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_VIEW permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && Array.isArray(scope.operatorIds)) {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Fetch documents using CaregiverDocument model
    const documents = await prisma.caregiverDocument.findMany({
      where: {
        caregiverId: params.id
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch uploader details for each document
    const uploadedByIds = documents
      .map(doc => doc.uploadedBy)
      .filter((id): id is string => id !== null);
    
    const uploaders = uploadedByIds.length > 0 
      ? await prisma.user.findMany({
          where: { id: { in: uploadedByIds } },
          select: { id: true, firstName: true, lastName: true }
        })
      : [];

    const uploaderMap = new Map(
      uploaders.map(u => [u.id, `${u.firstName} ${u.lastName}`])
    );

    // Transform documents
    const transformedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileUrl: doc.documentUrl,
      documentType: doc.documentType,
      expiryDate: doc.expiryDate,
      uploadDate: doc.uploadDate,
      uploadedBy: doc.uploadedBy ? uploaderMap.get(doc.uploadedBy) || null : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return NextResponse.json({ documents: transformedDocuments });
  } catch (error) {
    console.error('[GET Documents] Error:', error);
    return handleAuthError(error);
  }
}

// POST /api/operator/caregivers/[id]/documents - Upload new document
const createDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  documentUrl: z.string().url(),
  documentType: z.enum(['CERTIFICATION', 'BACKGROUND_CHECK', 'TRAINING', 'CONTRACT', 'IDENTIFICATION', 'REFERENCE', 'OTHER']),
  expiryDate: z.string().datetime().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_UPDATE permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_UPDATE);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && Array.isArray(scope.operatorIds)) {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Create document
    const document = await prisma.caregiverDocument.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        documentUrl: parsed.data.documentUrl,
        documentType: parsed.data.documentType,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        caregiverId: params.id,
        uploadedBy: user.id,
      }
    });

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document
    }, { status: 201 });
  } catch (error) {
    console.error('[POST Document] Error:', error);
    return handleAuthError(error);
  }
}
