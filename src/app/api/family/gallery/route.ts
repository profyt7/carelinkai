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

    // Build where clause
    const where: any = { familyId };
    if (search) {
      where.caption = { contains: search, mode: 'insensitive' };
    }
    if (albumId) {
      where.albumId = albumId;
    }

    // Fetch photos
    const photos = await prisma.galleryPhoto.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset,
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
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
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
