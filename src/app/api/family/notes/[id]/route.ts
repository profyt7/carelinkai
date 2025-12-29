
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

// DELETE /api/family/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const noteId = params.id;

    // Find the note and verify ownership
    const note = await prisma.familyNote.findUnique({
      where: { id: noteId },
      include: {
        family: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the author or a family admin
    const familyMember = note.family.members[0];
    if (!familyMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const canDelete =
      note.authorId === user.id || familyMember.role === 'OWNER';

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only the author or family owner can delete this note' },
        { status: 403 }
      );
    }

    await prisma.familyNote.delete({
      where: { id: noteId },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      'FamilyNote',
      noteId,
      `Deleted note: ${note.title}`,
      { userId: user.id, title: note.title }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}
