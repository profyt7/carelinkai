import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, UserStatus, FamilyMemberStatus, FamilyMemberRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Dev-only safety gate (allow override for e2e in built server)
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ success: false, message: 'Only available in development mode' }, { status: 403 });
  }

  const prisma = new PrismaClient();
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

    // Ensure FamilyMember entry exists and ACTIVE
    await prisma.familyMember.upsert({
      where: {
        familyId_userId: {
          familyId: family.id,
          userId: user.id,
        }
      } as any,
      update: { status: FamilyMemberStatus.ACTIVE, role: FamilyMemberRole.OWNER, joinedAt: new Date() },
      create: {
        familyId: family.id,
        userId: user.id,
        role: FamilyMemberRole.OWNER,
        status: FamilyMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, userId: user.id, familyId: family.id, email, password: rawPassword });
  } catch (e) {
    console.error('upsert-family failed', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
