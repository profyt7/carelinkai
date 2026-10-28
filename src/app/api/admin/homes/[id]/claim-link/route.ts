export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '@/lib/claim-token';

/**
 * POST /api/admin/homes/[id]/claim-link
 * Body: { operatorEmail: string; clevelandFounder?: boolean; expiresInHours?: number }
 *
 * Generates a tokenized claim link that lets an operator claim a specific home
 * and optionally receive Cleveland founder free-access benefits.
 * Admin-only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const homeId = params.id;
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId } });
  if (!home) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    operatorEmail,
    clevelandFounder = true,
    expiresInHours = DEFAULT_CLAIM_TOKEN_TTL_HOURS, // 45 days (callers may override)
  } = body as { operatorEmail?: string; clevelandFounder?: boolean; expiresInHours?: number };

  if (!operatorEmail) {
    return NextResponse.json({ error: 'operatorEmail is required' }, { status: 400 });
  }

  const secret = process.env['NEXTAUTH_SECRET'] || '';
  const now = Math.floor(Date.now() / 1000);

  const token = signClaimToken(
    {
      operatorEmail: operatorEmail.toLowerCase(),
      homeId,
      clevelandFounder: Boolean(clevelandFounder),
      iat: now,
      exp: now + expiresInHours * 3600,
    },
    secret
  );

  const appUrl =
    process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';
  const claimUrl = `${appUrl}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;

  return NextResponse.json({ token, claimUrl, expiresInHours });
}
