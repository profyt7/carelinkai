import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Dev-only safety gate
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, message: 'Only available in development mode' }, { status: 403 });
  }

  const prisma = new PrismaClient();
  try {
    const body = await request.json().catch(() => ({} as any));
    const email = (body.email as string) || 'caregiver+e2e@carelinkai.com';
    const rawPassword = (body.password as string) || 'Caregiver123!';
    const firstName = (body.firstName as string) || 'Care';
    const lastName = (body.lastName as string) || 'Giver';

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Upsert user as CAREGIVER
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        passwordHash,
        role: UserRole.CAREGIVER,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        firstName,
        lastName,
      },
      create: {
        email: email.toLowerCase(),
        passwordHash,
        role: UserRole.CAREGIVER,
        status: UserStatus.ACTIVE,
        firstName,
        lastName,
        emailVerified: new Date(),
      },
      select: { id: true }
    });

    // Ensure caregiver profile exists
    const existing = await prisma.caregiver.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!existing) {
      await prisma.caregiver.create({
        data: {
          userId: user.id,
          bio: 'E2E caregiver test user',
          yearsExperience: 1,
          hourlyRate: 20,
        }
      });
    }

    return NextResponse.json({ success: true, id: user.id, email, password: rawPassword });
  } catch (e) {
    console.error('upsert-caregiver failed', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
