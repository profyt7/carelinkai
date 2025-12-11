import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

const NotesSchema = z.object({
  notes: z.string().max(20000).optional().default(''),
});

const AddNoteSchema = z.object({
  category: z.string().optional(),
  note: z.string(),
  isInternal: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { home: { select: { operatorId: true } } },
    });
    if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const json = await req.json().catch(() => ({}));
    const parsed = AddNoteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    // Add note to internal notes
    const timestamp = new Date().toLocaleString();
    const noteText = [
      `[${timestamp}] ${parsed.data.category ? `[${parsed.data.category}]` : ''}`,
      parsed.data.note,
      '---',
    ].join('\n');

    const updatedNotes = inquiry.internalNotes
      ? `${inquiry.internalNotes}\n\n${noteText}`
      : noteText;

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { internalNotes: updatedNotes },
      select: { id: true, internalNotes: true },
    });

    return NextResponse.json({ id: updated.id, internalNotes: updated.internalNotes || '' });
  } catch (e) {
    console.error('Add note failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { home: { select: { operatorId: true } } },
    });
    if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const json = await req.json().catch(() => ({}));
    const parsed = NotesSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { internalNotes: parsed.data.notes || '' },
      select: { id: true, internalNotes: true },
    });

    return NextResponse.json({ id: updated.id, internalNotes: updated.internalNotes || '' });
  } catch (e) {
    console.error('Update notes failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
