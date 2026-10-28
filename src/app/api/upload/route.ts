import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { requireAuth } from '@/lib/auth-utils';
import { captureError } from '@/lib/sentry';
import { DataClassification } from '@prisma/client';
import { getUploadDestination } from '@/lib/storage/router';
import { uploadBuffer, getBucket, toS3Url } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];

// Caller audit (2026-05-14):
//   residents/DocumentUploadModal  → PHI (medical records, care plans)
//   inquiries/DocumentUploadModal  → PHI (insurance, medical records)
//   caregivers/DocumentUploadModal → PII (certs, contracts, background checks)
// Default is PHI for safety — any unclassified upload is treated as PHI.

/**
 * POST /api/upload — Upload file with classification-aware routing.
 * Accepts optional FormData field `classification` (PHI|PII|PUBLIC).
 * PHI → S3 (BAA-covered). PII/PUBLIC → Cloudinary.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const classificationParam = (formData.get('classification') as string | null) ?? 'PHI';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: PDF, JPEG, PNG, DOC, DOCX' },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
    }

    const classification =
      classificationParam === 'PII' ? DataClassification.PII :
      classificationParam === 'PUBLIC' ? DataClassification.PUBLIC :
      DataClassification.PHI;

    const dest = getUploadDestination(classification);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (dest === 's3') {
      const ext = extension;
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { bucket } = await uploadBuffer({ key, contentType: file.type, body: buffer });
      const url = toS3Url(bucket, key);
      return NextResponse.json({
        success: true,
        url,
        storage: 's3',
        classification,
        originalFilename: file.name,
      }, { status: 200 });
    }

    // PII / PUBLIC → Cloudinary
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'carelinkai/caregiver-documents',
          resource_type: 'auto',
          public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      storage: 'cloudinary',
      classification,
      originalFilename: file.name,
    }, { status: 200 });

  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'upload' },
    });
    console.error('Upload error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
