import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

/**
 * DELETE /api/operator/inquiries/documents/[documentId]
 * Delete a specific inquiry document
 */
export async function DELETE(req: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch document with inquiry and home info
    const document = await prisma.inquiryDocument.findUnique({
      where: { id: params.documentId },
      include: {
        inquiry: {
          include: {
            home: {
              select: { operatorId: true },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check operator access
    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || document.inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete document
    await prisma.inquiryDocument.delete({
      where: { id: params.documentId },
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      AuditAction.DELETE,
      'inquiry_document',
      params.documentId,
      `Deleted document: ${document.fileName} from inquiry ${document.inquiryId}`,
      undefined
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to delete inquiry document:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
