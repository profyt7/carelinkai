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

    // Log Cloudinary configuration status for debugging
    console.log('[Gallery Upload] Checking Cloudinary configuration:', {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '***SET***' : 'NOT SET',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '***SET***' : 'NOT SET',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'NOT SET',
      isConfigured: isCloudinaryConfigured(),
    });

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      console.error('[Gallery Upload] Cloudinary is not configured. Environment variables missing:', {
        CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      });
      
      return NextResponse.json(
        { 
          error: 'File upload is not configured. Please contact your administrator.',
          code: 'CLOUDINARY_NOT_CONFIGURED',
          details: {
            cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: !!process.env.CLOUDINARY_API_KEY,
            apiSecret: !!process.env.CLOUDINARY_API_SECRET,
          }
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

    // Get or create default SharedGallery for this family
    let gallery;
    if (albumId) {
      // Use specified album/gallery
      gallery = await prisma.sharedGallery.findUnique({
        where: { id: albumId },
      });
      if (!gallery || gallery.familyId !== familyId) {
        return NextResponse.json({ error: 'Invalid album ID' }, { status: 400 });
      }
    } else {
      // Get or create default gallery for family
      gallery = await prisma.sharedGallery.findFirst({
        where: {
          familyId,
          title: 'Family Photos', // Default gallery name
        },
      });

      if (!gallery) {
        // Create default gallery
        gallery = await prisma.sharedGallery.create({
          data: {
            familyId,
            creatorId: session.user.id,
            title: 'Family Photos',
            description: 'Default photo gallery for family',
          },
        });
      }
    }

    // Diagnostic: Check if galleryPhoto model exists in Prisma Client
    if (!prisma.galleryPhoto) {
      console.error('[Gallery Upload] CRITICAL: prisma.galleryPhoto is undefined!');
      console.error('[Gallery Upload] Available Prisma models:', Object.keys(prisma).filter(k => k.startsWith(k[0].toLowerCase())).sort());
      return NextResponse.json(
        { 
          error: 'Database model not found. Please contact support.',
          code: 'PRISMA_MODEL_MISSING',
          details: 'GalleryPhoto model is not available in Prisma Client'
        },
        { status: 500 }
      );
    }

    // Create gallery photo record with correct field names
    const photo = await prisma.galleryPhoto.create({
      data: {
        galleryId: gallery.id, // Correct: use galleryId
        uploaderId: session.user.id, // Correct: use uploaderId
        fileUrl: uploadResult.secure_url, // Correct: use fileUrl
        thumbnailUrl,
        caption: caption || file.name,
        metadata: {
          cloudinaryPublicId: uploadResult.public_id,
          fileType: file.type,
          fileSize: file.size,
          originalFilename: file.name,
        },
      },
      include: {
        uploader: { // Correct: use uploader
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        gallery: { // Correct: use gallery
          select: {
            id: true,
            title: true, // Correct: use title
            familyId: true, // Include familyId for SSE event
          },
        },
      },
    });

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId: photo.gallery.familyId,
        userId: session.user.id,
        type: 'PHOTO_UPLOADED',
        description: `uploaded a photo: ${caption || file.name}`,
        metadata: {
          photoId: photo.id,
          galleryId: photo.galleryId,
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
    publish(`family:${photo.gallery.familyId}`, {
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
