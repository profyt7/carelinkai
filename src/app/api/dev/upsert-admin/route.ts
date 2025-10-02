import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, message: 'Only available in development mode' }, { status: 403 });
  }

  const prisma = new PrismaClient();
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email as string) || process.env['ADMIN_EMAIL'] || 'admin@carelinkai.com';
    const rawPassword = (body.password as string) || process.env['ADMIN_PASSWORD'] || 'Admin123!';

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const admin = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        firstName: 'Admin',
        lastName: 'User',
      },
      create: {
        email: email.toLowerCase(),
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ success: true, id: admin.id });
  } catch (e) {
    console.error('upsert-admin failed', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
