export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import { deleteFromCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { captureError } from '@/lib/sentry';

/**
 * DELETE /api/operator/onboarding/seeded-photo/[photoId]
 *
 * Lets an operator remove an auto-populated (scraped) photo from their seeded
 * listing during onboarding Step 2 — before the listing is claimed, when they
 * are not yet home.operatorId. Authorized when the photo's home is the
 * operator's assigned seeded home (or, post-claim, the operator owns it).
 *
 * Only auto-populated photos can be removed through this route.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role !== UserRole.OPERATOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
    if (!operator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }

    const photo = await prisma.homePhoto.findUnique({ where: { id: params.photoId } });
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }
    if (!photo.autoPopulated) {
      return NextResponse.json({ error: 'Only auto-populated photos can be removed here' }, { status: 400 });
    }

    // Authorize: the photo's home must be this operator's seeded home, or one
    // they already own.
    const ownsViaSeed = operator.seededHomeId === photo.homeId;
    let ownsViaListing = false;
    if (!ownsViaSeed) {
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: photo.homeId } });
      ownsViaListing = !!home && home.operatorId === operator.id;
    }
    if (!ownsViaSeed && !ownsViaListing) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Best-effort Cloudinary cleanup. public_id is deterministic from the
    // source URL (see photo-rehost.ts), so we can reconstruct it.
    if (photo.sourceUrl && isCloudinaryConfigured()) {
      try {
        const hash = createHash('sha256').update(photo.sourceUrl).digest('hex').slice(0, 16);
        const publicId = `operator-profiles/seeded/${photo.homeId}/${hash}`;
        await deleteFromCloudinary(publicId, 'image');
      } catch {
        // Orphaned Cloudinary asset is acceptable; DB row removal is what matters.
      }
    }

    await prisma.homePhoto.delete({ where: { id: photo.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:onboarding:seeded-photo:{photoId}' },
    });
    console.error('Delete seeded photo failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
