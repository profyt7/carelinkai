import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const UpdateSchema = z.object({
  content: z.string().min(1).max(1000),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Find the note
    const note = await prisma.residentNote.findUnique({
      where: { id: params.noteId },
      select: { id: true, createdByUserId: true, residentId: true },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the author (only author can edit their own notes)
    if (note.createdByUserId !== me.id) {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 });
    }

    // Validate body
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    }

    const { content } = parsed.data;

    // Update the note
    const updated = await prisma.residentNote.update({
      where: { id: params.noteId },
      data: { content },
      select: {
        id: true,
        content: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await createAuditLogFromRequest(req, AuditAction.UPDATE, 'ResidentNote', note.id, 'Updated resident note', {
      residentId: params.id,
    });

    return NextResponse.json({ success: true, note: updated });
  } catch (e) {
    console.error('Note update error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Find the note
    const note = await prisma.residentNote.findUnique({
      where: { id: params.noteId },
      select: { id: true, createdByUserId: true, residentId: true },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the author (only author can delete their own notes)
    if (note.createdByUserId !== me.id) {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 });
    }

    // Delete the note
    await prisma.residentNote.delete({
      where: { id: params.noteId },
    });

    await createAuditLogFromRequest(req, AuditAction.DELETE, 'ResidentNote', note.id, 'Deleted resident note', {
      residentId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Note delete error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
