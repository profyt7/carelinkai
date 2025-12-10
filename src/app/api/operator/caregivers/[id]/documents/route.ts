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
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
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

    // Fetch documents
    const documents = await prisma.document.findMany({
      where: {
        entityType: 'CAREGIVER',
        entityId: params.id
      },
      include: {
        uploadedByUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform documents
    const transformedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      category: doc.category,
      expiryDate: doc.expiryDate,
      status: doc.status,
      uploadedBy: doc.uploadedByUser ? 
        `${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}` : 
        null,
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
  fileUrl: z.string().url(),
  fileType: z.string().min(1),
  fileSize: z.number().int().min(0).optional().nullable(),
  category: z.string().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  status: z.string().optional().default('ACTIVE'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_EDIT permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_EDIT);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
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
    const document = await prisma.document.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        fileUrl: parsed.data.fileUrl,
        fileType: parsed.data.fileType,
        fileSize: parsed.data.fileSize,
        category: parsed.data.category,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        status: parsed.data.status,
        entityType: 'CAREGIVER',
        entityId: params.id,
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
