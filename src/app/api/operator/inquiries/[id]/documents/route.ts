// HIPAA: InquiryDocument classification=PHI, destination=S3
// See HIPAA_PHASE_1_DESIGN.md §2.3 (InquiryDocument rationale)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, AuditAction, DataClassification } from '@prisma/client';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { captureError } from '@/lib/sentry';
import { getDownloadUrl } from '@/lib/storage/download';

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

    // AUTHZ: operator access check above ensures user is authorized for this inquiry
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

    const resolved = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        fileUrl: await getDownloadUrl({ storage: doc.storage, fileUrl: doc.fileUrl }),
      }))
    );

    await createAuditLogFromRequest(_req, AuditAction.READ, 'InquiryDocument', params.id, 'PHI read: inquiry documents listing');
    return NextResponse.json({ documents: resolved });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:inquiries:{id}:documents' },
    });
    console.error('Failed to fetch inquiry documents:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

const DocumentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().min(1, 'File URL is required'),
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

    const storageProvider = fileUrl.startsWith('s3://') || fileUrl.includes('amazonaws.com') ? 's3' : 'cloudinary';

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
        classification: DataClassification.PHI,
        storage: storageProvider,
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
    await createAuditLogFromRequest(
      req,
      AuditAction.CREATE,
      'inquiry_document',
      document.id,
      `Uploaded document: ${fileName} for inquiry ${params.id}`,
      undefined
    );

    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:inquiries:{id}:documents' },
    });
    console.error('Failed to create inquiry document:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
