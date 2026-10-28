
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, deleteObject, getBucket, toS3Url, parseS3Url } from '@/lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/residents/[id]/photo
 * Upload resident photo to S3 (classification=PHI always).
 * Resident photos are linked to a care record and qualify as PHI per HIPAA posture memo §2.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, photoUrl: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split('/')[1];
    const key = `residents/${params.id}/photo/${Date.now()}.${ext}`;

    const { bucket } = await uploadBuffer({ key, contentType: file.type, body: buffer });
    const photoUrl = toS3Url(bucket, key);

    // Delete old S3 photo if present
    if (resident.photoUrl) {
      const parsed = parseS3Url(resident.photoUrl);
      if (parsed) {
        await deleteObject({ bucket: parsed.bucket, key: parsed.key }).catch(() => {
          // Non-fatal — old photo cleanup failure doesn't block new upload
        });
      }
    }

    await prisma.resident.update({
      where: { id: params.id },
      data: { photoUrl },
    });

    return NextResponse.json({ success: true, photoUrl });
  } catch (e) {
    console.error('Photo upload error:', e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/residents/[id]/photo
 * Remove resident photo from S3 and clear photoUrl.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, photoUrl: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    if (resident.photoUrl) {
      const parsed = parseS3Url(resident.photoUrl);
      if (parsed) {
        await deleteObject({ bucket: parsed.bucket, key: parsed.key }).catch(() => {
          // Non-fatal
        });
      }
    }

    await prisma.resident.update({
      where: { id: params.id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Photo delete error:', e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
