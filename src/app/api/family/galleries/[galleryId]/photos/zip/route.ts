import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkFamilyMembership } from '@/lib/services/family';
import { z } from 'zod';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  galleryId: z.string().cuid(),
});

const photoIdsSchema = z.object({
  photoIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validatedParams = paramsSchema.safeParse(params);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid gallery ID' },
        { status: 400 }
      );
    }

    const { galleryId } = validatedParams.data;

    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { id: true, familyId: true, title: true }
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    const isMember = await checkFamilyMembership(session.user.id, gallery.familyId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const photos = await prisma.galleryPhoto.findMany({
      where: { galleryId },
      orderBy: { createdAt: 'asc' as const },
      select: {
        id: true,
        fileUrl: true,
        caption: true
      }
    });

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos to download' }, { status: 404 });
    }

    const zipFilename = `gallery-${galleryId}-${Date.now()}.zip`;
    const tempFilePath = path.join(os.tmpdir(), zipFilename);

    const output = fs.createWriteStream(tempFilePath);
    const archive = archiver('zip', {
      zlib: { level: 5 }
    });

    archive.pipe(output);

    photos.forEach((photo, index) => {
      const fileUrl = photo.fileUrl;
      if (!fileUrl) return;

      const filePathRelative = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
      const filePath = path.join(process.cwd(), 'public', filePathRelative);
      
      const fileExtension = path.extname(fileUrl);
      const paddedIndex = String(index + 1).padStart(4, '0');
      const zipEntryName = `photo-${paddedIndex}${fileExtension}`;

      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: zipEntryName });
      }
    });

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });

    const zipFile = fs.readFileSync(tempFilePath);
    
    fs.unlinkSync(tempFilePath);

    const response = new NextResponse(zipFile);
    response.headers.set('Content-Type', 'application/zip');
    response.headers.set('Content-Disposition', `attachment; filename="${zipFilename}"`);
    
    return response;
  } catch (error) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: 'Failed to create zip file' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validatedParams = paramsSchema.safeParse(params);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid gallery ID' },
        { status: 400 }
      );
    }

    const { galleryId } = validatedParams.data;

    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { id: true, familyId: true, title: true }
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    const isMember = await checkFamilyMembership(session.user.id, gallery.familyId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedBody = photoIdsSchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { photoIds } = validatedBody.data;

    const photosQuery = {
      where: {
        galleryId,
        ...(photoIds && photoIds.length > 0 ? { id: { in: photoIds } } : {})
      },
      orderBy: { createdAt: 'asc' as const },
      select: {
        id: true,
        fileUrl: true,
        caption: true
      }
    };

    const photos = await prisma.galleryPhoto.findMany(photosQuery);

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos to download' }, { status: 404 });
    }

    const zipFilename = `gallery-${galleryId}-${Date.now()}.zip`;
    const tempFilePath = path.join(os.tmpdir(), zipFilename);

    const output = fs.createWriteStream(tempFilePath);
    const archive = archiver('zip', {
      zlib: { level: 5 }
    });

    archive.pipe(output);

    photos.forEach((photo, index) => {
      const fileUrl = photo.fileUrl;
      if (!fileUrl) return;

      const filePathRelative = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
      const filePath = path.join(process.cwd(), 'public', filePathRelative);
      
      const fileExtension = path.extname(fileUrl);
      const paddedIndex = String(index + 1).padStart(4, '0');
      const zipEntryName = `photo-${paddedIndex}${fileExtension}`;

      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: zipEntryName });
      }
    });

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });

    const zipFile = fs.readFileSync(tempFilePath);
    
    fs.unlinkSync(tempFilePath);

    const response = new NextResponse(zipFile);
    response.headers.set('Content-Type', 'application/zip');
    response.headers.set('Content-Disposition', `attachment; filename="${zipFilename}"`);
    
    return response;
  } catch (error) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: 'Failed to create zip file' },
      { status: 500 }
    );
  }
}
