import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/residents/[id]/photo
 * Upload resident photo
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Get resident to ensure it exists and user has access
    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, photoUrl: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Generate file path
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split('/')[1];
    const filename = `${params.id}_${Date.now()}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'residents');
    const filePath = join(uploadDir, filename);
    const photoUrl = `/uploads/residents/${filename}`;

    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Delete old photo if exists
    if (resident.photoUrl && resident.photoUrl.startsWith('/uploads/')) {
      const oldPath = join(process.cwd(), 'public', resident.photoUrl);
      try {
        await unlink(oldPath);
      } catch (e) {
        console.log('Could not delete old photo:', e);
      }
    }

    // Write new file
    await writeFile(filePath, buffer);

    // Update resident record
    await prisma.resident.update({
      where: { id: params.id },
      data: { photoUrl },
    });

    return NextResponse.json({ success: true, photoUrl });
  } catch (e) {
    console.error('Photo upload error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/residents/[id]/photo
 * Delete resident photo
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, photoUrl: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Delete file if exists
    if (resident.photoUrl && resident.photoUrl.startsWith('/uploads/')) {
      const oldPath = join(process.cwd(), 'public', resident.photoUrl);
      try {
        await unlink(oldPath);
      } catch (e) {
        console.log('Could not delete photo:', e);
      }
    }

    // Update resident record
    await prisma.resident.update({
      where: { id: params.id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Photo delete error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
