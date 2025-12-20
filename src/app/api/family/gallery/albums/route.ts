
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');

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

    // Fetch albums with photo counts
    const albums = await prisma.sharedGallery.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      include: {
        photos: {
          select: { id: true },
        },
      },
    });

    const albumsWithCounts = albums.map((album) => ({
      id: album.id,
      name: album.name,
      photoCount: album.photos?.length ?? 0,
      createdAt: album.createdAt,
    }));

    return NextResponse.json({ albums: albumsWithCounts });
  } catch (error: any) {
    console.error('Error fetching albums:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { familyId, name } = body;

    if (!familyId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Create album
    const album = await prisma.sharedGallery.create({
      data: {
        familyId,
        name,
        createdById: session.user.id,
      },
    });

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId,
        userId: session.user.id,
        type: 'ALBUM_CREATED',
        description: `created album: ${name}`,
        metadata: {
          albumId: album.id,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.DOCUMENT_CREATED,
      userId: session.user.id,
      details: `Created album: ${name}`,
    });

    return NextResponse.json({ album: { ...album, photoCount: 0 } });
  } catch (error: any) {
    console.error('Error creating album:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
