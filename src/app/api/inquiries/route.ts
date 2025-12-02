export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

const prisma = new PrismaClient();

const CreateInquirySchema = z.object({
  homeId: z.string().min(1),
  message: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only FAMILY or ADMIN can create inquiries
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, family: { select: { id: true } } } });
    if (!user || (user.role !== UserRole.FAMILY && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = CreateInquirySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const familyId = user.family?.id;
    if (!familyId && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Family profile not found' }, { status: 400 });
    }

    // Validate home exists and is active
    const home = await prisma.assistedLivingHome.findUnique({ where: { id: parsed.data.homeId }, select: { id: true, status: true } });
    if (!home) return NextResponse.json({ error: 'Home not found' }, { status: 404 });

    const inquiry = await prisma.inquiry.create({
      data: {
        familyId: familyId ?? (await ensureAdminFamily(session.user.id)),
        homeId: parsed.data.homeId,
        message: parsed.data.message || null,
      },
      select: { id: true, createdAt: true },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resourceType: 'Inquiry',
      resourceId: inquiry.id,
      description: 'Created inquiry',
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { homeId: parsed.data.homeId },
    });

    return NextResponse.json({ id: inquiry.id, createdAt: inquiry.createdAt.toISOString() }, { status: 201 });
  } catch (e) {
    console.error('Create inquiry failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureAdminFamily(userId: string): Promise<string> {
  // For ADMIN-created inquiries in tests/tools, create or fetch a Family linked to the admin
  const existing = await prisma.family.findFirst({ where: { userId } });
  if (existing) return existing.id;
  const fam = await prisma.family.create({ data: { userId } });
  return fam.id;
}
