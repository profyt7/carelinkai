import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, AuditAction } from '@prisma/client';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

const ReminderSchema = z.object({
  type: z.string(),
  dueDate: z.string().datetime(),
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
    const parsed = ReminderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    // Add reminder to internal notes
    const reminderNote = [
      `[REMINDER: ${parsed.data.type}]`,
      `Due: ${new Date(parsed.data.dueDate).toLocaleString()}`,
      parsed.data.notes ? `Notes: ${parsed.data.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const updatedNotes = inquiry.internalNotes
      ? `${inquiry.internalNotes}\n\n${reminderNote}`
      : reminderNote;

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { internalNotes: updatedNotes },
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Inquiry',
      inquiry.id,
      'Reminder set',
      { reminderType: parsed.data.type, dueDate: parsed.data.dueDate }
    );

    return NextResponse.json({ 
      inquiry: updated,
      reminder: {
        id: `reminder-${Date.now()}`, // Temporary ID since we're storing in notes
        type: parsed.data.type,
        dueDate: parsed.data.dueDate,
        notes: parsed.data.notes,
      }
    });
  } catch (e) {
    console.error('Set reminder failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
