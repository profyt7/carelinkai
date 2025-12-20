
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const search = searchParams.get('search') ?? '';
    const albumId = searchParams.get('albumId') ?? '';
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    // Check membership
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause - query through SharedGallery relation
    const where: any = {
      gallery: {
        familyId: familyId
      }
    };
    
    if (search) {
      where.caption = { contains: search, mode: 'insensitive' };
    }
    
    if (albumId) {
      where.galleryId = albumId; // Fixed: use galleryId instead of albumId
    }

    // Fetch photos
    const photos = await prisma.galleryPhoto.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // Fixed: use createdAt instead of uploadedAt
      take: limit,
      skip: offset,
      include: {
        uploader: { // Fixed: use uploader instead of uploadedBy
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        gallery: { // Fixed: use gallery instead of album
          select: {
            id: true,
            title: true, // Fixed: use title instead of name
          },
        },
      },
    });

    const total = await prisma.galleryPhoto.count({ where });

    return NextResponse.json({
      photos,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
