export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { UserRole } from '@prisma/client';
import { notifyAdminOfListingClaim } from '@/lib/claims/claim-admin-notice';

/**
 * POST /api/operator/homes/[id]/claim
 *
 * Transfers ownership of an admin-seeded home to the authenticated Cleveland founder.
 * Guards:
 *   1. Operator must have clevelandFounder=true
 *   2. operator.seededHomeId must match :id
 *
 * On success:
 *   - home.operatorId → current operator
 *   - home.status → 'ACTIVE'
 *   - operator.seededHomeId → null (claimed, no longer pending)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional body: { imageRightsAcknowledged?: boolean }
  let imageRightsAcknowledged = false;
  try {
    const body = await req.json();
    imageRightsAcknowledged = body?.imageRightsAcknowledged === true;
  } catch {
    // No / invalid body — treat as not acknowledged.
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  if (!operator.clevelandFounder) {
    return NextResponse.json(
      { error: 'Only Cleveland founders can claim seeded homes' },
      { status: 403 }
    );
  }

  if (operator.seededHomeId !== params.id) {
    return NextResponse.json(
      { error: 'This home is not assigned to your founder account' },
      { status: 403 }
    );
  }

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: params.id },
    include: { address: true, _count: { select: { photos: { where: { autoPopulated: true } } } } },
  });
  if (!home) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  // If the listing carries auto-populated (scraped) photos, the operator must
  // confirm they have rights to use their website's photos/content (Task 6).
  if (home._count.photos > 0 && !imageRightsAcknowledged) {
    return NextResponse.json(
      { error: 'Image rights acknowledgment is required to claim a listing with pre-populated photos.' },
      { status: 400 }
    );
  }

  // Transfer ownership in a transaction
  const updatedHome = await prisma.$transaction(async (tx) => {
    const h = await tx.assistedLivingHome.update({
      where: { id: params.id },
      data: {
        operatorId: operator.id,
        status: 'ACTIVE',
        ...(imageRightsAcknowledged ? { imageRightsAcknowledgedAt: new Date() } : {}),
      },
      include: { address: true },
    });
    await tx.operator.update({
      where: { id: operator.id },
      data: { seededHomeId: null },
    });
    // History: the listing changed hands (sprint W5-1).
    await recordEvent(tx, {
      entityType: 'LISTING_CLAIM',
      entityId: params.id,
      eventType: 'claim.completed',
      field: 'operatorId',
      oldValue: { operatorId: home.operatorId, status: home.status },
      newValue: { operatorId: operator.id, status: 'ACTIVE' },
      source: 'OPERATOR',
      actor: { userId: user.id, role: user.role },
    });
    return h;
  });

  // Surface the claim to the founder/admin (non-blocking, OL-079). The seededHomeId guard above already makes
  // this a one-time path; notifyAdminOfListingClaim is also idempotent per claim key.
  // The emailed-link (token) claim is complete: one admin email (skipped for test claimants, always logged).
  void notifyAdminOfListingClaim({
    claimKey: `token:${updatedHome.id}:${operator.id}`, kind: 'token', homeId: updatedHome.id,
    facility: updatedHome.name, city: updatedHome.address?.city,
    claimantName: [user.firstName, user.lastName].filter(Boolean).join(' '), claimantEmail: user.email,
    actor: { userId: user.id, role: user.role },
  }).catch((e) => console.error('[claim] admin notification failed', e));

  return NextResponse.json({ home: updatedHome });
}
