
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
        family: true,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Check permissions
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId: photo.familyId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only owner or uploader can delete
    if (membership.role !== 'OWNER' && photo.uploadedById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from Cloudinary (optional - you may want to keep for backup)
    try {
      if (photo.cloudinaryPublicId) {
        await deleteFromCloudinary(photo.cloudinaryPublicId, 'image');
      }
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete photo from database
    await prisma.galleryPhoto.delete({
      where: { id: photoId },
    });

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId: photo.familyId,
        userId: session.user.id,
        type: 'PHOTO_DELETED',
        description: `deleted a photo: ${photo.caption}`,
        metadata: {
          photoId,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DOCUMENT_DELETED,
      'GALLERY_PHOTO',
      photoId,
      `Deleted photo: ${photo.caption}`,
      undefined
    );

    // Publish SSE event
    publish(`family:${photo.familyId}`, {
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
