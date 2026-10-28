
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function POST(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId } = params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Fetch photo with gallery relation
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
      include: {
        gallery: true,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Check membership
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId: photo.gallery.familyId,
        userId: session.user.id,
        role: { in: ['OWNER', 'CARE_PROXY', 'MEMBER'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create comment
    const comment = await prisma.galleryComment.create({
      data: {
        photoId,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId: photo.familyId,
        userId: session.user.id,
        type: 'PHOTO_COMMENTED',
        description: `commented on a photo: ${photo.caption}`,
        metadata: {
          photoId,
          commentId: comment.id,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DOCUMENT_UPDATED,
      'GALLERY_PHOTO',
      photoId,
      `Added comment to photo: ${photo.caption}`,
      undefined
    );

    // Publish SSE event
    publish(`family:${photo.familyId}`, {
      type: 'photo:commented',
      photoId,
      comment,
    });

    return NextResponse.json({ comment });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
