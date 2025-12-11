import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

/**
 * DELETE /api/operator/residents/documents/[documentId] - Delete a resident document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check permissions
    const user = await requirePermission(PERMISSIONS.RESIDENTS_UPDATE);

    // Verify document exists and get resident ID for audit
    const document = await prisma.residentDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true, residentId: true, fileName: true, documentType: true }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete document
    await prisma.residentDocument.delete({
      where: { id: params.documentId }
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      user.id,
      AuditAction.DELETE,
      {
        resourceType: 'ResidentDocument',
        residentId: document.residentId,
        documentId: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
