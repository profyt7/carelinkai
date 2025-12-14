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
    console.log('=== GALLERY UPLOAD START ===');
    
    // 1. Check session
    console.log('[1/8] Checking session...');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[ERROR] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[1/8] ✓ Session OK:', session.user.id);

    // 2. Check Cloudinary configuration
    console.log('[2/8] Checking Cloudinary configuration...');
    console.log('[2/8] Config status:', {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '***SET***' : 'NOT SET',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '***SET***' : 'NOT SET',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'NOT SET',
      isConfigured: isCloudinaryConfigured(),
    });

    if (!isCloudinaryConfigured()) {
      console.error('[2/8] ✗ Cloudinary not configured');
      return NextResponse.json(
        { 
          error: 'File upload is not configured. Please contact your administrator.',
          code: 'CLOUDINARY_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }
    console.log('[2/8] ✓ Cloudinary configured');

    // 3. Parse form data
    console.log('[3/8] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const familyId = formData.get('familyId') as string;
    const caption = formData.get('caption') as string;
    const albumId = formData.get('albumId') as string | null;

    if (!file || !familyId) {
      console.error('[3/8] ✗ Missing required fields:', { hasFile: !!file, hasFamilyId: !!familyId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error('[3/8] ✗ File too large:', file.size);
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }
    console.log('[3/8] ✓ Form data OK:', { fileName: file.name, fileSize: file.size, familyId });

    // 4. Check membership
    console.log('[4/8] Checking membership...');
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: session.user.id,
        role: { in: ['OWNER', 'CARE_PROXY', 'MEMBER'] },
      },
    });

    if (!membership) {
      console.error('[4/8] ✗ No membership found');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.log('[4/8] ✓ Membership OK:', membership.role);

    // 5. Upload to Cloudinary
    console.log('[5/8] Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            ...UPLOAD_PRESETS.FAMILY_GALLERY,
            folder: `${UPLOAD_PRESETS.FAMILY_GALLERY.folder}/${familyId}/gallery`,
          },
          (error, result) => {
            if (error) {
              console.error('[5/8] ✗ Cloudinary upload failed:', error);
              reject(error);
            } else {
              console.log('[5/8] ✓ Cloudinary upload OK:', result.secure_url);
              resolve(result);
            }
          }
        )
        .end(buffer);
    });

    // Store the raw Cloudinary URL without transformations
    // Let Next.js Image component handle optimization
    const thumbnailUrl = uploadResult.secure_url;
    console.log('[5/8] ✓ Upload complete:', {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });

    // 6. Get or create gallery
    console.log('[6/8] Finding/creating gallery...');
    let gallery;
    if (albumId) {
      console.log('[6/8] Using specified album:', albumId);
      gallery = await prisma.sharedGallery.findUnique({
        where: { id: albumId },
      });
      if (!gallery || gallery.familyId !== familyId) {
        console.error('[6/8] ✗ Invalid album ID');
        return NextResponse.json({ error: 'Invalid album ID' }, { status: 400 });
      }
    } else {
      console.log('[6/8] Finding default gallery for family:', familyId);
      gallery = await prisma.sharedGallery.findFirst({
        where: {
          familyId,
          title: 'Family Photos',
        },
      });

      if (!gallery) {
        console.log('[6/8] Creating default gallery...');
        gallery = await prisma.sharedGallery.create({
          data: {
            familyId,
            creatorId: session.user.id,
            title: 'Family Photos',
            description: 'Default photo gallery for family',
          },
        });
        console.log('[6/8] ✓ Gallery created:', gallery.id);
      } else {
        console.log('[6/8] ✓ Gallery found:', gallery.id);
      }
    }

    // 7. Check Prisma Client models
    console.log('[7/8] Checking Prisma Client...');
    console.log('[7/8] Available models:', Object.keys(prisma).filter(k => k[0] === k[0].toLowerCase()).sort());
    
    if (!prisma.galleryPhoto) {
      console.error('[7/8] ✗ CRITICAL: prisma.galleryPhoto is undefined!');
      console.error('[7/8] This indicates Prisma Client was not properly generated with latest schema');
      return NextResponse.json(
        { 
          error: 'Database initialization error. Please contact support.',
          code: 'PRISMA_MODEL_MISSING'
        },
        { status: 500 }
      );
    }
    console.log('[7/8] ✓ Prisma Client OK - galleryPhoto model available');

    // 8. Create photo record
    console.log('[8/8] Creating photo record...');
    const photo = await prisma.galleryPhoto.create({
      data: {
        galleryId: gallery.id,
        uploaderId: session.user.id,
        fileUrl: uploadResult.secure_url,
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
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        gallery: {
          select: {
            id: true,
            title: true,
            familyId: true,
          },
        },
      },
    });
    console.log('[8/8] ✓ Photo record created:', photo.id);

    // Create activity feed item
    console.log('[8/8] Creating activity feed item...');
    await prisma.activityFeedItem.create({
      data: {
        familyId: photo.gallery.familyId,
        actorId: session.user.id, // Fixed: was userId, should be actorId
        type: 'PHOTO_UPLOADED',
        resourceType: 'gallery', // Fixed: added required resourceType field
        resourceId: photo.galleryId, // Added: resource reference
        description: `uploaded a photo: ${caption || file.name}`,
        metadata: {
          photoId: photo.id,
          galleryId: photo.galleryId,
        },
      },
    });
    console.log('[8/8] ✓ Activity feed item created');

    // Create audit log
    console.log('[8/8] Creating audit log...');
    await createAuditLogFromRequest(request, {
      action: AuditAction.DOCUMENT_UPLOADED,
      userId: session.user.id,
      details: `Uploaded photo: ${caption || file.name}`,
    });
    console.log('[8/8] ✓ Audit log created');

    // Publish SSE event
    console.log('[8/8] Publishing SSE event...');
    publish(`family:${photo.gallery.familyId}`, {
      type: 'photo:uploaded',
      photo: {
        ...photo,
        comments: [],
      },
    });
    console.log('[8/8] ✓ SSE event published');

    console.log('=== GALLERY UPLOAD SUCCESS ===');
    return NextResponse.json({ photo });
  } catch (error: any) {
    console.error('=== GALLERY UPLOAD ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
