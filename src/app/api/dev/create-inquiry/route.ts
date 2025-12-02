export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Dev-only helper to create an inquiry directly. Useful for staging E2E when the
// public POST /api/inquiries route is not yet deployed.
// Gated by ALLOW_DEV_ENDPOINTS=1.

const Schema = z.object({
  homeId: z.string().min(1),
  name: z.string().min(1).default('E2E Tester'),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
  residentName: z.string().optional(),
  moveInTimeframe: z.string().optional(),
  careNeeded: z.array(z.string()).default(['Assisted Living']),
  tourDate: z.string().datetime().optional(),
  source: z.string().optional().default('dev'),
});

export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: (session as any).user.email } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    const data = parsed.data;

    // Ensure family exists for this user (create if missing)
    const family = await prisma.family.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    });

    // Validate home exists
    const home = await prisma.assistedLivingHome.findUnique({ where: { id: data.homeId }, select: { id: true } });
    if (!home) return NextResponse.json({ error: 'Home not found' }, { status: 404 });

    const created = await prisma.inquiry.create({
      data: {
        familyId: family.id,
        homeId: home.id,
        message: data.message ?? null,
        tourDate: data.tourDate ? new Date(data.tourDate) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('dev/create-inquiry error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
