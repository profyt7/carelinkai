export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// DEV-ONLY endpoint to create an operator, associated Operator record, and a Home.
// Assumptions:
// - Enabled only when ALLOW_DEV_ENDPOINTS=1
// - Creates/updates user with OPERATOR role and ACTIVE status
// - Ensures at least one AssistedLivingHome for the operator and returns its ID

export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, companyName } = body || {};
    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'email, password, companyName required' }, { status: 400 });
    }

    const pwHash = await bcrypt.hash(password, 10);
    // Upsert user as OPERATOR
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: pwHash, role: 'OPERATOR' as any, status: 'ACTIVE' as any },
      create: {
        email,
        passwordHash: pwHash,
        firstName: 'Op',
        lastName: 'E2E',
        role: 'OPERATOR' as any,
        status: 'ACTIVE' as any,
      },
    });

    // Ensure Operator
    const op = await prisma.operator.upsert({
      where: { userId: user.id },
      update: { companyName },
      create: { userId: user.id, companyName },
    });

    // Ensure at least one Home for operator
    let home = await prisma.assistedLivingHome.findFirst({ where: { operatorId: op.id } });
    if (!home) {
      home = await prisma.assistedLivingHome.create({
        data: {
          operatorId: op.id,
          name: `${companyName} Home`,
          description: 'Dev home for E2E',
          status: 'ACTIVE' as any,
          careLevel: ['ASSISTED'],
          capacity: 100,
          amenities: ['wifi'],
        },
        select: { id: true },
      });
    }

    return NextResponse.json({ homeId: home.id });
  } catch (e) {
    console.error('dev upsert-operator error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
