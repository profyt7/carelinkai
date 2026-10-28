
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/documents/cloudinary';
import { extractDocumentText } from '@/lib/documents/extraction';
import { DataClassification, DocumentType } from '@prisma/client';
import { getUploadDestination } from '@/lib/storage/router';
import { uploadBuffer, getBucket, toS3Url } from '@/lib/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

function classifyByLinkage(residentId: string | null, inquiryId: string | null): DataClassification {
  if (residentId) return DataClassification.PHI;
  if (inquiryId) return DataClassification.PII;
  // No PHI linkage — generic unlinked document; safe default is PII
  return DataClassification.PII;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as DocumentType;
    const residentId = formData.get('residentId') as string | null;
    const inquiryId = formData.get('inquiryId') as string | null;
    const tags = formData.get('tags') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and images (JPEG, PNG, GIF, WebP) are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const classification = classifyByLinkage(residentId, inquiryId);
    const dest = getUploadDestination(classification);

    let fileUrl: string;
    let storage: string;

    if (dest === 's3') {
      const ext = file.name.split('.').pop() || 'bin';
      const key = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { bucket } = await uploadBuffer({ key, contentType: file.type, body: buffer });
      fileUrl = toS3Url(bucket, key);
      storage = 's3';
    } else {
      const uploadResult = await uploadToCloudinary(buffer, {
        folder: 'carelinkai/documents',
        resourceType: 'auto',
        tags: tags ? JSON.parse(tags) : [],
      });
      fileUrl = uploadResult.url;
      storage = 'cloudinary';
    }

    const document = await prisma.document.create({
      data: {
        type,
        title: file.name,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        mimeType: file.type,
        classification,
        storage,
        residentId: residentId || undefined,
        inquiryId: inquiryId || undefined,
        uploadedById: session.user.id,
        tags: tags ? JSON.parse(tags) : [],
        notes: notes || undefined,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        resident: {
          select: { id: true, firstName: true, lastName: true },
        },
        inquiry: {
          select: { id: true, contactName: true },
        },
      },
    });

    // Trigger text extraction in background (don't wait for it)
    extractDocumentText(document.id).catch((error) => {
      console.error('Background extraction error:', error);
    });

    return NextResponse.json({
      success: true,
      document,
      message: 'Document uploaded successfully. Text extraction in progress.',
    }, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
