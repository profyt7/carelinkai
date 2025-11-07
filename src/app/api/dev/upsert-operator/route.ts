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
  // Disable in production unconditionally; require explicit opt-in elsewhere
  if ((process.env.NODE_ENV as string) === 'production' || process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, companyName, homes } = body || {} as {
      email?: string;
      password?: string;
      companyName?: string;
      homes?: Array<{ name: string; capacity?: number }>;
    };
    if (!email || !companyName) {
      return NextResponse.json({ error: 'email and companyName required' }, { status: 400 });
    }

    const effectivePassword = password ?? 'password';
    const pwHash = await bcrypt.hash(effectivePassword, 10);
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

    // Ensure homes for operator. If homes array provided, ensure each; else ensure a default one.
    const desiredHomes: Array<{ name: string; capacity?: number }> = Array.isArray(homes) && homes.length > 0
      ? homes
      : [{ name: `${companyName} Home`, capacity: 100 }];

    const ensured: Array<{ id: string; name: string }> = [];
    for (const h of desiredHomes) {
      const existing = await prisma.assistedLivingHome.findFirst({
        where: { operatorId: op.id, name: h.name },
        select: { id: true, name: true },
      });
      if (existing) {
        ensured.push(existing);
        continue;
      }
      const created = await prisma.assistedLivingHome.create({
        data: {
          operatorId: op.id,
          name: h.name,
          description: 'Dev home for E2E',
          status: 'ACTIVE' as any,
          careLevel: ['ASSISTED'],
          capacity: typeof h.capacity === 'number' ? h.capacity : 100,
          amenities: ['wifi'],
        },
        select: { id: true, name: true },
      });
      ensured.push(created);
    }

    if (ensured.length === 0) {
      return NextResponse.json({ error: 'Failed to ensure homes' }, { status: 500 });
    }

    // Back-compat: include homeId of the first ensured home for older tests
    return NextResponse.json({ homes: ensured, homeId: ensured[0]?.id });
  } catch (e) {
    console.error('dev upsert-operator error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
