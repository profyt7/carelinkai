export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus, FamilyMemberStatus, FamilyMemberRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Allow when explicitly enabled via ALLOW_DEV_ENDPOINTS, regardless of NODE_ENV
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({} as any));
    const email: string = (body.email as string) || 'family+e2e@carelinkai.com';
    const rawPassword: string = (body.password as string) || 'Family123!';
    const firstName: string = (body.firstName as string) || 'Fam';
    const lastName: string = (body.lastName as string) || 'Ily';
    // Sprint W5-3: optional payer-lane answer seed (a PlacementSearch tagged with
    // payerSource) so the dashboard concierge card can be exercised per lane.
    const payerSource: string | undefined = typeof body.payerSource === 'string' ? body.payerSource : undefined;

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Upsert user as FAMILY
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        passwordHash,
        role: UserRole.FAMILY,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        firstName,
        lastName,
      },
      create: {
        email: email.toLowerCase(),
        passwordHash,
        role: UserRole.FAMILY,
        status: UserStatus.ACTIVE,
        firstName,
        lastName,
        emailVerified: new Date(),
      },
      select: { id: true }
    });

    // Ensure family row exists
    const family = await prisma.family.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    });

    // Ensure FamilyMember entry exists and ACTIVE (avoid ON CONFLICT in CI by manual upsert)
    const existingMember = await prisma.familyMember.findFirst({
      where: { familyId: family.id, userId: user.id },
      select: { id: true },
    }).catch(() => null);

    if (existingMember?.id) {
      await prisma.familyMember.update({
        where: { id: existingMember.id },
        data: { status: FamilyMemberStatus.ACTIVE, role: FamilyMemberRole.OWNER, joinedAt: new Date() },
      });
    } else {
      await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: user.id,
          role: FamilyMemberRole.OWNER,
          status: FamilyMemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
    }

    if (payerSource) {
      await prisma.placementSearch.create({
        data: {
          userId: user.id,
          queryText: 'E2E payer-lane seed',
          parsedCriteria: { source: 'e2e' },
          searchResults: { matches: [] },
          status: 'COMPLETED',
          payerSource: payerSource as any,
        },
      });
    }
    // Fresh fixture: no dismissed upsell card carried over from an earlier run.
    await prisma.family.update({ where: { id: family.id }, data: { conciergeUpsellDismissedAt: null } });

    return NextResponse.json({ success: true, userId: user.id, familyId: family.id, email, password: rawPassword });
  } catch (e) {
    console.error('upsert-family failed', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    // Prisma singleton handles its own lifecycle
  }
}
