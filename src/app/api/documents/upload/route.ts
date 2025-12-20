
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/documents/cloudinary';
import { extractDocumentText } from '@/lib/documents/extraction';
import { DocumentType } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as DocumentType;
    const residentId = formData.get('residentId') as string | null;
    const inquiryId = formData.get('inquiryId') as string | null;
    const tags = formData.get('tags') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and images (JPEG, PNG, GIF, WebP) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate document type
    if (!type) {
      return NextResponse.json(
        { error: 'Document type is required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: 'carelinkai/documents',
      resourceType: 'auto',
      tags: tags ? JSON.parse(tags) : [],
    });

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        type: type,
        fileName: file.name,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        mimeType: file.type,
        residentId: residentId || undefined,
        inquiryId: inquiryId || undefined,
        uploadedById: session.user.id,
        tags: tags ? JSON.parse(tags) : [],
        notes: notes || undefined,
        extractionStatus: 'PENDING',
        complianceStatus: 'PENDING',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        inquiry: {
          select: {
            id: true,
            contactName: true,
          },
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
    console.error('Document upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
