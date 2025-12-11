import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

/**
 * GET /api/operator/inquiries/[id]/documents
 * Fetch all documents for an inquiry
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if inquiry exists and user has access
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        home: { select: { operatorId: true } },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Check operator access
    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch documents
    const documents = await prisma.inquiryDocument.findMany({
      where: { inquiryId: params.id },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ documents });
  } catch (e) {
    console.error('Failed to fetch inquiry documents:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

const DocumentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Valid file URL is required'),
  fileType: z.string().min(1, 'File type is required'),
  documentType: z.string().min(1, 'Document type is required'),
  description: z.string().optional(),
  fileSize: z.number().int().positive('File size must be positive'),
});

/**
 * POST /api/operator/inquiries/[id]/documents
 * Create a new document for an inquiry
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if inquiry exists and user has access
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        home: { select: { operatorId: true } },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Check operator access
    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Validate request body
    const body = await req.json();
    const validation = DocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { fileName, fileUrl, fileType, documentType, description, fileSize } = validation.data;

    // Create document
    const document = await prisma.inquiryDocument.create({
      data: {
        inquiryId: params.id,
        fileName,
        fileUrl,
        fileType,
        documentType,
        description: description || null,
        fileSize,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(req, {
      action: 'CREATE',
      entityType: 'inquiry_document',
      entityId: document.id,
      details: `Uploaded document: ${fileName} for inquiry ${params.id}`,
      userId: user.id,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    console.error('Failed to create inquiry document:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
