export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { verifyClaimToken } from '@/lib/claim-token';

/**
 * POST /api/operator/claim
 * Body: { token: string }
 *
 * Validates a Cleveland founder claim token and applies the benefits:
 * - Sets clevelandFounder = true
 * - Sets freeAccessUntil = now + 6 months
 * - Optionally assigns a home to the operator
 */
export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}));
  const { token } = body as { token?: string };

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const secret = process.env['NEXTAUTH_SECRET'] || '';
  const payload = verifyClaimToken(token, secret);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired claim token' }, { status: 400 });
  }

  // Token must be addressed to this operator's email
  if (payload.operatorEmail.toLowerCase() !== user.email!.toLowerCase()) {
    return NextResponse.json(
      { error: 'This claim link is for a different account' },
      { status: 403 }
    );
  }

  const freeUntil = new Date();
  freeUntil.setMonth(freeUntil.getMonth() + 6);

  await prisma.operator.update({
    where: { id: operator.id },
    data: {
      clevelandFounder: true,
      freeAccessUntil: freeUntil,
    },
  });

  return NextResponse.json({ ok: true, clevelandFounder: true, freeAccessUntil: freeUntil });
}
