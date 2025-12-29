import { NextResponse, NextRequest } from 'next/server';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// DELETE /api/operator/caregivers/[id]/documents/[docId] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
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

    // Verify document exists
    // Note: Document model doesn't have entityType/entityId fields
    // This should be updated when caregiver documents are properly modeled
    const existingDoc = await prisma.document.findFirst({
      where: {
        id: params.docId,
      }
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete document
    await prisma.document.delete({
      where: { id: params.docId }
    });

    // TODO: Delete actual file from storage (S3, etc.)
    // This would be implemented based on your file storage solution

    return NextResponse.json({
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE Document] Error:', error);
    return handleAuthError(error);
  }
}
