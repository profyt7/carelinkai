export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DEV-ONLY: returns the stored verificationToken for a user so e2e tests can
// exercise the email-verification flow without actually receiving email.
export async function GET(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email param required' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { verificationToken: true, verificationTokenExpiry: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({
    verificationToken: user.verificationToken,
    verificationTokenExpiry: user.verificationTokenExpiry,
    emailVerified: user.emailVerified,
  });
}
