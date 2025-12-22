import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_MANAGE_DOCUMENTS);

    const document = await prisma.caregiverDocument.findUnique({
      where: { id: params.docId },
    });

    if (!document || document.caregiverId !== params.id) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    await prisma.caregiverDocument.delete({
      where: { id: params.docId },
    });

    await createAuditLogFromRequest(


      request,


      AuditAction.DELETE,


      'DOCUMENT',


      params.docId,


      'Deleted document',


      { caregiverId: params.id }


    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
