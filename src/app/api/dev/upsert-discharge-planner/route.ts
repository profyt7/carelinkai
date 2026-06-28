export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// DEV-ONLY: create/refresh a DISCHARGE_PLANNER user + DischargePlannerProfile.
// Enabled only when ALLOW_DEV_ENDPOINTS=1. Mirrors upsert-family/upsert-operator.
export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({} as any));
    const email: string = ((body.email as string) || 'dp+e2e@carelinkai.com').toLowerCase();
    const rawPassword: string = (body.password as string) || 'Planner123!';
    const firstName: string = (body.firstName as string) || 'Demo';
    const lastName: string = (body.lastName as string) || 'Planner';
    const organization: string | null = (body.organization as string) ?? null;

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: UserRole.DISCHARGE_PLANNER, status: UserStatus.ACTIVE, emailVerified: new Date(), firstName, lastName },
      create: { email, passwordHash, role: UserRole.DISCHARGE_PLANNER, status: UserStatus.ACTIVE, firstName, lastName, emailVerified: new Date() },
      select: { id: true },
    });

    await prisma.dischargePlannerProfile.upsert({
      where: { userId: user.id },
      update: { organization },
      create: { userId: user.id, organization },
    });

    return NextResponse.json({ success: true, userId: user.id, email });
  } catch (e) {
    console.error('dev upsert-discharge-planner error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
