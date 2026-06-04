export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    include: { address: true },
  });
  if (!home) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  // Transfer ownership in a transaction
  const [updatedHome] = await prisma.$transaction([
    prisma.assistedLivingHome.update({
      where: { id: params.id },
      data: { operatorId: operator.id, status: 'ACTIVE' },
      include: { address: true },
    }),
    prisma.operator.update({
      where: { id: operator.id },
      data: { seededHomeId: null },
    }),
  ]);

  return NextResponse.json({ home: updatedHome });
}
