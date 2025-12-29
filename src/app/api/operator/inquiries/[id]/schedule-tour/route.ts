import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, InquiryStatus, AuditAction } from '@prisma/client';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

const ScheduleTourSchema = z.object({
  tourDate: z.string().datetime(),
  tourGuide: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { home: { select: { operatorId: true } } },
    });
    if (!inquiry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const json = await req.json().catch(() => ({}));
    const parsed = ScheduleTourSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    // Update inquiry with tour date and status
    const tourDate = new Date(parsed.data.tourDate);
    const updateData: any = {
      tourDate,
      status: InquiryStatus.TOUR_SCHEDULED,
    };

    // Add notes if provided
    if (parsed.data.notes || parsed.data.tourGuide) {
      const noteText = [
        parsed.data.tourGuide ? `Tour guide: ${parsed.data.tourGuide}` : null,
        parsed.data.notes,
      ]
        .filter(Boolean)
        .join('\n');

      updateData.internalNotes = inquiry.internalNotes
        ? `${inquiry.internalNotes}\n\n[Tour Scheduled]\n${noteText}`
        : `[Tour Scheduled]\n${noteText}`;
    }

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Inquiry',
      inquiry.id,
      'Tour scheduled',
      { tourDate: parsed.data.tourDate, status: 'TOUR_SCHEDULED' }
    );

    return NextResponse.json({ inquiry: updated });
  } catch (e) {
    console.error('Schedule tour failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
