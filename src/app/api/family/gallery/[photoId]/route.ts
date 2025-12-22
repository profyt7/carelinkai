
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId } = params;

    // Fetch photo
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
      include: {
        gallery: true,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Check permissions
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId: photo.gallery.familyId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only owner or uploader can delete
    if (membership.role !== 'OWNER' && photo.uploaderId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Note: Cloudinary deletion not implemented as GalleryPhoto model 
    // doesn't track cloudinaryPublicId. Files are managed via fileUrl only.

    // Delete photo from database
    await prisma.galleryPhoto.delete({
      where: { id: photoId },
    });

    // Create activity feed item
    await prisma.activityFeedItem.create({
      data: {
        familyId: photo.gallery.familyId,
        actorId: session.user.id,
        type: 'DOCUMENT_DELETED', // Using DOCUMENT_DELETED as PHOTO_DELETED doesn't exist in ActivityType enum
        resourceType: 'gallery_photo',
        resourceId: photoId,
        description: `deleted a photo: ${photo.caption}`,
        metadata: {
          photoId,
          galleryId: photo.gallery.id,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      'GALLERY_PHOTO',
      photoId,
      `Deleted photo: ${photo.caption}`,
      undefined
    );

    // Publish SSE event
    publish(`family:${photo.gallery.familyId}`, {
      type: 'photo:deleted',
      photoId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
