import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkFamilyMembership } from '@/lib/services/family';
import { FamilyMemberRole } from '@prisma/client';
import { publish } from '@/lib/server/sse';
import { z } from 'zod';

const updatePhotoSchema = z.object({
  caption: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { galleryId: string; photoId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { galleryId, photoId } = params;

    // Get gallery to determine familyId
    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { id: true, familyId: true }
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Check if photo exists and belongs to the gallery
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, uploaderId: true, galleryId: true }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.galleryId !== galleryId) {
      return NextResponse.json({ error: 'Photo does not belong to this gallery' }, { status: 400 });
    }

    // Check family membership
    const membership = await checkFamilyMembership(session.user.id, gallery.familyId);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions - allow if uploader or OWNER/CARE_PROXY
    const isUploader = photo.uploaderId === session.user.id;
    const hasPrivilegedRole = [FamilyMemberRole.OWNER, FamilyMemberRole.CARE_PROXY].includes(membership.role);
    
    if (!isUploader && !hasPrivilegedRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const result = updatePhotoSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Update photo caption
    const updatedPhoto = await prisma.galleryPhoto.update({
      where: { id: photoId },
      data: {
        caption: result.data.caption !== undefined ? result.data.caption : undefined,
      },
      select: { id: true, caption: true }
    });

    // Publish SSE event (non-critical, wrapped in try/catch)
    try {
      publish(`family:${gallery.familyId}`, {
        event: 'gallery.photo.updated',
        data: {
          galleryId,
          photoId,
          caption: updatedPhoto.caption
        }
      });

      // Log activity
      await prisma.activityFeedItem.create({
        data: {
          familyId: gallery.familyId,
          actorId: session.user.id,
          type: 'GALLERY_PHOTO_UPDATED',
          description: `Updated photo caption in gallery`,
          metadata: {
            galleryId,
            photoId
          }
        }
      });
    } catch (error) {
      console.error('Non-critical error in photo update:', error);
    }

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error('Error updating photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { galleryId: string; photoId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { galleryId, photoId } = params;

    // Get gallery to determine familyId & current cover
    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { id: true, familyId: true, coverPhotoUrl: true }
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Check if photo exists and belongs to the gallery
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        uploaderId: true,
        galleryId: true,
        fileUrl: true,
        thumbnailUrl: true
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.galleryId !== galleryId) {
      return NextResponse.json({ error: 'Photo does not belong to this gallery' }, { status: 400 });
    }

    // Check family membership
    const membership = await checkFamilyMembership(session.user.id, gallery.familyId);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions - allow if uploader or OWNER/CARE_PROXY
    const isUploader = photo.uploaderId === session.user.id;
    const hasPrivilegedRole = [FamilyMemberRole.OWNER, FamilyMemberRole.CARE_PROXY].includes(membership.role);
    
    if (!isUploader && !hasPrivilegedRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the photo record
    await prisma.galleryPhoto.delete({
      where: { id: photoId }
    });

    // If this was the cover photo, update the gallery
    let updatedCoverInfo: Record<string, any> = {};
    const removedWasCover =
      gallery.coverPhotoUrl &&
      (gallery.coverPhotoUrl === photo.thumbnailUrl ||
        gallery.coverPhotoUrl === photo.fileUrl);

    if (removedWasCover) {
      // Find another photo to use as cover
      const anotherPhoto = await prisma.galleryPhoto.findFirst({
        where: { galleryId },
        orderBy: { createdAt: 'desc' },
        select: { thumbnailUrl: true, fileUrl: true }
      });

      // Update gallery cover photo
      await prisma.sharedGallery.update({
        where: { id: galleryId },
        data: {
          coverPhotoUrl: anotherPhoto
            ? anotherPhoto.thumbnailUrl || anotherPhoto.fileUrl
            : null
        }
      });

      updatedCoverInfo = {
        coverPhotoUpdated: true,
        newCoverPhotoUrl: anotherPhoto
          ? anotherPhoto.thumbnailUrl || anotherPhoto.fileUrl
          : null
      };
    }

    // Publish SSE event (non-critical, wrapped in try/catch)
    try {
      publish(`family:${gallery.familyId}`, {
        event: 'gallery.photo.deleted',
        data: {
          galleryId,
          photoId,
          ...updatedCoverInfo
        }
      });

      // Log activity
      await prisma.activityFeedItem.create({
        data: {
          familyId: gallery.familyId,
          actorId: session.user.id,
          type: 'GALLERY_PHOTO_DELETED',
          description: `Deleted a photo from gallery`,
          metadata: {
            galleryId,
            photoId
          }
        }
      });
    } catch (error) {
      console.error('Non-critical error in photo deletion:', error);
    }

    return NextResponse.json({ success: true, ...updatedCoverInfo });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
