import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import cloudinary, { isCloudinaryConfigured, getThumbnailUrl, UPLOAD_PRESETS } from '@/lib/cloudinary';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { 
          error: 'File upload is not configured. Please contact your administrator.',
          code: 'CLOUDINARY_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const familyId = formData.get('familyId') as string;
    const caption = formData.get('caption') as string;
    const albumId = formData.get('albumId') as string | null;

    if (!file || !familyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Check membership
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: session.user.id,
        role: { in: ['OWNER', 'CARE_PROXY', 'MEMBER'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using preset
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            ...UPLOAD_PRESETS.FAMILY_GALLERY,
            folder: `${UPLOAD_PRESETS.FAMILY_GALLERY.folder}/${familyId}/gallery`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    // Generate thumbnail URL using helper
    const thumbnailUrl = getThumbnailUrl(uploadResult.public_id);

    // Create gallery photo record
    const photo = await prisma.galleryPhoto.create({
      data: {
        familyId,
        caption: caption || file.name,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        thumbnailUrl,
        fileType: file.type,
        fileSize: file.size,
        uploadedById: session.user.id,
        albumId: albumId || null,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        album: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId,
        userId: session.user.id,
        type: 'PHOTO_UPLOADED',
        description: `uploaded a photo: ${caption || file.name}`,
        metadata: {
          photoId: photo.id,
          albumId: albumId || null,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.DOCUMENT_UPLOADED,
      userId: session.user.id,
      details: `Uploaded photo: ${caption || file.name}`,
    });

    // Publish SSE event
    publish(`family:${familyId}`, {
      type: 'photo:uploaded',
      photo: {
        ...photo,
        comments: [],
      },
    });

    return NextResponse.json({ photo });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
