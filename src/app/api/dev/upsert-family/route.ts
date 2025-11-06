import { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus, FamilyMemberStatus, FamilyMemberRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Disable in production unconditionally; require explicit opt-in elsewhere
  if ((process.env.NODE_ENV as string) === 'production' || process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({} as any));
    const email: string = (body.email as string) || 'family+e2e@carelinkai.com';
    const rawPassword: string = (body.password as string) || 'Family123!';
    const firstName: string = (body.firstName as string) || 'Fam';
    const lastName: string = (body.lastName as string) || 'Ily';

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
    const existingMember = await prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: family.id, userId: user.id } },
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

    return NextResponse.json({ success: true, userId: user.id, familyId: family.id, email, password: rawPassword });
  } catch (e) {
    console.error('upsert-family failed', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    // Prisma singleton handles its own lifecycle
  }
}
