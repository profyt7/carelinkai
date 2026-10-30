// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * DEV/E2E ONLY: upsert a PROVIDER user + profile with the given service categories, so specs can
 * check category search against real rows. Same gate as the other /api/dev upserts.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ success: false, message: 'Only available in development mode' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({} as any));
    const email = ((body.email as string) || 'provider+e2e@carelinkai.com').toLowerCase();
    const businessName = (body.businessName as string) || 'E2E Provider';
    const serviceTypes = Array.isArray(body.serviceTypes) ? (body.serviceTypes as string[]).map(String) : [];
    const deliveryModes = Array.isArray(body.deliveryModes) ? (body.deliveryModes as string[]).map(String) : [];
    // Search-only fixture: nobody signs in as it, so an unusable random password (no DEMO_ACCOUNT_PASSWORD needed).
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: UserRole.PROVIDER, status: UserStatus.ACTIVE, emailVerified: new Date() },
      create: { email, passwordHash, role: UserRole.PROVIDER, status: UserStatus.ACTIVE, firstName: 'E2E', lastName: 'Provider', emailVerified: new Date() },
      select: { id: true },
    });

    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: { businessName, serviceTypes, deliveryModes, isActive: true },
      create: { userId: user.id, businessName, contactName: businessName, contactEmail: email, serviceTypes, deliveryModes, isActive: true },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: provider.id, userId: user.id, email });
  } catch (e) {
    console.error('upsert-provider failed', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
