import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditAction, UserRole } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CreateInquirySchema = z.object({
  homeId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  residentName: z.string().optional(),
  moveInTimeframe: z.string().optional(),
  careNeeded: z.array(z.string()).min(1),
  message: z.string().optional(),
  tourDate: z.string().datetime().optional(),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only FAMILY (or ADMIN for administrative actions) can create inquiries
    if (user.role !== UserRole.FAMILY && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = CreateInquirySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      homeId,
      name,
      email,
      phone,
      residentName,
      moveInTimeframe,
      careNeeded,
      message,
      tourDate,
      source,
    } = parsed.data;

    const family = await prisma.family.findUnique({ where: { userId: user.id } });
    if (!family) {
      return NextResponse.json({ error: 'Family profile not found' }, { status: 400 });
    }

    const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { id: true } });
    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    const created = await prisma.inquiry.create({
      data: {
        familyId: family.id,
        homeId: home.id,
        message: message || null,
        tourDate: tourDate ? new Date(tourDate) : null,
      },
      select: { id: true },
    });

    // Audit log (non-blocking if it fails)
    try {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          resourceType: 'INQUIRY',
          resourceId: created.id,
          description: 'Family inquiry created',
          ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown',
          userAgent: req.headers.get('user-agent') || undefined,
          userId: user.id,
          actionedBy: user.id,
          metadata: {
            source: source ?? 'unknown',
            contact: { name, email, phone },
            residentName,
            moveInTimeframe,
            careNeeded,
          },
        },
      });
    } catch {}

    return NextResponse.json({ id: created.id, success: true }, { status: 201 });
  } catch (e) {
    console.error('Create inquiry failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
